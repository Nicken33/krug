const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let publicTunnelUrl = null;
let tunnelProcess = null;

function startCloudflareTunnel(port) {
  const cloudflaredPath = path.join(__dirname, '../bin/cloudflared.exe');
  if (!fs.existsSync(cloudflaredPath)) {
    console.log('[Tunnel] cloudflared.exe not found in bin/, skipping auto-tunnel.');
    return;
  }

  console.log('[Tunnel] Starting Cloudflare Tunnel for worldwide access on port', port);
  try {
    tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${port}`]);

    tunnelProcess.stderr.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !publicTunnelUrl) {
        publicTunnelUrl = match[0];
        console.log('[Круг] ПУБЛИЧНЫЙ ДОСТУП ДЛЯ ДРУЗЕЙ:', publicTunnelUrl);
      }
    });

    tunnelProcess.on('error', (err) => {
      console.warn('[Tunnel] Cloudflared error:', err.message);
    });
  } catch (err) {
    console.warn('[Tunnel] Could not launch cloudflared:', err.message);
  }
}

function startServer(port = 7880) {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '15mb' }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
    maxHttpBufferSize: 2e7 // 20MB
  });

  const listenPort = Number(process.env.PORT) || Number(port) || 7880;

  // Cloudflare Tunnel only on desktop/local if binary exists
  startCloudflareTunnel(listenPort);

  // Persistence
  const DATA_FILE = path.join(__dirname, 'krug_data.json');
  let appState = {
    rooms: {
      'krug-main': {
        code: 'krug-main',
        name: 'Основной круг',
        password: '',
        createdAt: Date.now(),
        textChannels: [
          { id: 'general', name: 'общий' },
          { id: 'gaming', name: 'игры-и-пати' },
          { id: 'memes', name: 'мемы-и-флуд' }
        ],
        voiceChannels: [
          { id: 'voice-main', name: 'Общий голосовой', userLimit: 0 },
          { id: 'voice-room1', name: 'Комната отдыха', userLimit: 5 },
          { id: 'voice-gaming', name: 'Сквад / Катка', userLimit: 5 }
        ],
        messages: []
      }
    }
  };

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      appState = JSON.parse(raw);
    } catch (err) {
      console.error('[Server] Failed to load data:', err.message);
    }
  }

  function saveData() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(appState, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Server] Save data error:', err.message);
    }
  }

  // Active connected users
  const activeUsers = new Map();

  // STUN and free TURN servers (for reliable cross-country & NAT traversal)
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  // Static files from client/dist
  const clientDist = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      activeConnections: io.engine.clientsCount,
      roomsCount: Object.keys(appState.rooms).length,
      publicTunnelUrl: publicTunnelUrl,
      iceServers: ICE_SERVERS
    });
  });

  app.get('/api/tunnel', (req, res) => {
    res.json({
      publicTunnelUrl: publicTunnelUrl,
      port: listenPort
    });
  });

  app.post('/api/room/verify', (req, res) => {
    const { code, password } = req.body;
    if (!code) return res.status(400).json({ error: 'Код комнаты обязателен' });

    let room = appState.rooms[code];
    if (!room) {
      room = {
        code,
        name: `Комната ${code}`,
        password: password || '',
        createdAt: Date.now(),
        textChannels: [
          { id: 'general', name: 'общий' },
          { id: 'gaming', name: 'игры' }
        ],
        voiceChannels: [
          { id: 'voice-main', name: 'Голосовой' },
          { id: 'voice-room1', name: 'Комната 1' }
        ],
        messages: []
      };
      appState.rooms[code] = room;
      saveData();
      return res.json({ success: true, isNew: true, room });
    }

    if (room.password && room.password !== password) {
      return res.status(403).json({ error: 'Неверный пароль комнаты' });
    }

    res.json({ success: true, isNew: false, room });
  });

  // Socket
  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomCode, password, user }) => {
      let room = appState.rooms[roomCode];
      if (!room) {
        room = {
          code: roomCode,
          name: `Комната ${roomCode}`,
          password: password || '',
          createdAt: Date.now(),
          textChannels: [
            { id: 'general', name: 'общий' },
            { id: 'gaming', name: 'игры' }
          ],
          voiceChannels: [
            { id: 'voice-main', name: 'Голосовой' },
            { id: 'voice-room1', name: 'Комната 1' }
          ],
          messages: []
        };
        appState.rooms[roomCode] = room;
        saveData();
      } else if (room.password && room.password !== password) {
        return socket.emit('error-msg', { message: 'Неверный пароль комнаты' });
      }

      const userData = {
        socketId: socket.id,
        userId: user?.id || socket.id,
        username: user?.username || 'Гость',
        avatarColor: user?.avatarColor || '#5865f2',
        avatarUrl: user?.avatarUrl || null,
        status: user?.status || 'online',
        roomCode,
        currentVoiceChannel: null,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        isScreenSharing: false,
        ping: 0,
        joinedAt: Date.now()
      };

      activeUsers.set(socket.id, userData);
      socket.join(roomCode);

      const roomUsers = Array.from(activeUsers.values()).filter(u => u.roomCode === roomCode);
      socket.emit('room-joined', {
        room,
        users: roomUsers,
        iceServers: ICE_SERVERS,
        currentUser: userData,
        publicTunnelUrl: publicTunnelUrl
      });

      socket.to(roomCode).emit('user-joined-room', userData);
    });

    socket.on('join-voice', ({ channelId }) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;

      const oldChannelId = user.currentVoiceChannel;
      if (oldChannelId === channelId) return;

      if (oldChannelId) {
        socket.to(user.roomCode).emit('user-left-voice', {
          socketId: socket.id,
          channelId: oldChannelId
        });
      }

      user.currentVoiceChannel = channelId;
      user.isSpeaking = false;

      const peersInChannel = Array.from(activeUsers.values()).filter(
        u => u.roomCode === user.roomCode && 
             u.currentVoiceChannel === channelId && 
             u.socketId !== socket.id
      );

      socket.emit('voice-channel-peers', {
        channelId,
        peers: peersInChannel
      });

      socket.to(user.roomCode).emit('user-joined-voice', {
        user,
        channelId
      });
    });

    socket.on('leave-voice', () => {
      const user = activeUsers.get(socket.id);
      if (!user || !user.currentVoiceChannel) return;

      const channelId = user.currentVoiceChannel;
      user.currentVoiceChannel = null;
      user.isSpeaking = false;
      user.isScreenSharing = false;

      socket.to(user.roomCode).emit('user-left-voice', {
        socketId: socket.id,
        channelId
      });

      socket.emit('voice-left', { channelId });
    });

    socket.on('signal-offer', ({ targetSocketId, offer, isScreenShare }) => {
      const caller = activeUsers.get(socket.id);
      if (!caller) return;
      io.to(targetSocketId).emit('signal-offer', {
        callerSocketId: socket.id,
        caller,
        offer,
        isScreenShare: !!isScreenShare
      });
    });

    socket.on('signal-answer', ({ targetSocketId, answer, isScreenShare }) => {
      io.to(targetSocketId).emit('signal-answer', {
        responderSocketId: socket.id,
        answer,
        isScreenShare: !!isScreenShare
      });
    });

    socket.on('signal-ice', ({ targetSocketId, candidate, isScreenShare }) => {
      io.to(targetSocketId).emit('signal-ice', {
        senderSocketId: socket.id,
        candidate,
        isScreenShare: !!isScreenShare
      });
    });

    socket.on('voice-state-change', (changes) => {
      const user = activeUsers.get(socket.id);
      if (!user) return;
      Object.assign(user, changes);
      io.to(user.roomCode).emit('user-voice-state-updated', {
        socketId: socket.id,
        changes
      });
    });

    socket.on('send-message', ({ channelId, text, isDirect, recipientSocketId }) => {
      const user = activeUsers.get(socket.id);
      if (!user || !text || !text.trim()) return;

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        channelId: channelId || 'general',
        senderId: user.userId,
        senderSocketId: socket.id,
        senderName: user.username,
        senderColor: user.avatarColor,
        senderAvatarUrl: user.avatarUrl || null,
        text: text.trim(),
        timestamp: Date.now(),
        isDirect: !!isDirect,
        recipientSocketId: recipientSocketId || null
      };

      if (isDirect && recipientSocketId) {
        socket.emit('new-message', message);
        io.to(recipientSocketId).emit('new-message', message);
      } else {
        const room = appState.rooms[user.roomCode];
        if (room) {
          if (!room.messages) room.messages = [];
          room.messages.push(message);
          if (room.messages.length > 500) room.messages = room.messages.slice(-500);
          saveData();
        }
        io.to(user.roomCode).emit('new-message', message);
      }
    });

    socket.on('ping-measure', (timestamp, callback) => {
      if (typeof callback === 'function') callback();
      const user = activeUsers.get(socket.id);
      if (user && typeof timestamp === 'number') {
        user.ping = Math.max(1, Date.now() - timestamp);
        io.to(user.roomCode).emit('user-ping-updated', {
          socketId: socket.id,
          ping: user.ping
        });
      }
    });

    socket.on('disconnect', () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        activeUsers.delete(socket.id);
        if (user.currentVoiceChannel) {
          socket.to(user.roomCode).emit('user-left-voice', {
            socketId: socket.id,
            channelId: user.currentVoiceChannel
          });
        }
        socket.to(user.roomCode).emit('user-left-room', {
          socketId: socket.id,
          userId: user.userId,
          username: user.username
        });
      }
    });
  });

  server.listen(listenPort, '0.0.0.0', () => {
    console.log(`[Server] «Круг» running on http://0.0.0.0:${listenPort}`);
  });

  return { app, server, io };
}

if (require.main === module) {
  startServer(process.env.PORT || 7880);
}

module.exports = { startServer };
