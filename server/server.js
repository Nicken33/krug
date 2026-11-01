import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 7880;
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e7 // 10MB
});

// Storage for persistence (rooms and messages)
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

// Load saved data if present
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    appState = JSON.parse(raw);
    console.log('[Server] Loaded existing data from', DATA_FILE);
  } catch (err) {
    console.error('[Server] Failed to load persistence data:', err.message);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Save data error:', err.message);
  }
}

// In-memory active sessions
// socketId -> { socketId, od, username, avatarColor, roomCode, currentVoiceChannel, isMuted, isDeafened, isSpeaking, isScreenSharing, ping }
const activeUsers = new Map();

// Public STUN servers for WebRTC
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

// Serve static frontend if built
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

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeConnections: io.engine.clientsCount,
    roomsCount: Object.keys(appState.rooms).length,
    iceServers: ICE_SERVERS
  });
});

app.post('/api/room/verify', (req, res) => {
  const { code, password } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Код комнаты обязателен' });
  }

  const room = appState.rooms[code];
  if (!room) {
    // Create room automatically
    appState.rooms[code] = {
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
    saveData();
    return res.json({ success: true, isNew: true, room: appState.rooms[code] });
  }

  if (room.password && room.password !== password) {
    return res.status(403).json({ error: 'Неверный пароль комнаты' });
  }

  res.json({ success: true, isNew: false, room });
});

// Socket.io handlers
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // User joins room
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
      userId: user.id || socket.id,
      username: user.username || 'Гость',
      avatarColor: user.avatarColor || '#5865f2',
      status: user.status || 'online',
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

    // Send room metadata, messages history, and active members
    const roomUsers = Array.from(activeUsers.values()).filter(u => u.roomCode === roomCode);
    
    socket.emit('room-joined', {
      room,
      users: roomUsers,
      iceServers: ICE_SERVERS,
      currentUser: userData
    });

    // Notify other room members
    socket.to(roomCode).emit('user-joined-room', userData);
    console.log(`[Room] ${userData.username} (${socket.id}) joined room ${roomCode}`);
  });

  // Voice channel Join
  socket.on('join-voice', ({ channelId }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    const oldChannelId = user.currentVoiceChannel;
    if (oldChannelId === channelId) return;

    // Leave old voice channel if any
    if (oldChannelId) {
      socket.to(user.roomCode).emit('user-left-voice', {
        socketId: socket.id,
        channelId: oldChannelId
      });
    }

    user.currentVoiceChannel = channelId;
    user.isSpeaking = false;

    // Get list of existing peers in this voice channel to connect WebRTC mesh
    const peersInChannel = Array.from(activeUsers.values()).filter(
      u => u.roomCode === user.roomCode && 
           u.currentVoiceChannel === channelId && 
           u.socketId !== socket.id
    );

    // Tell the joining user who is already in the channel
    socket.emit('voice-channel-peers', {
      channelId,
      peers: peersInChannel
    });

    // Notify other peers in this room that this user entered voice
    socket.to(user.roomCode).emit('user-joined-voice', {
      user,
      channelId
    });

    console.log(`[Voice] ${user.username} entered channel ${channelId}. Existing peers: ${peersInChannel.length}`);
  });

  // Voice channel Leave
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
    console.log(`[Voice] ${user.username} left voice channel`);
  });

  // WebRTC Signaling: Offer
  socket.on('signal-offer', ({ targetSocketId, offer, isScreenShare }) => {
    const caller = activeUsers.get(socket.id);
    if (!caller) return;

    io.to(targetSocketId).emit('signal-offer', {
      callerSocketId: socket.id,
      caller: caller,
      offer,
      isScreenShare: !!isScreenShare
    });
  });

  // WebRTC Signaling: Answer
  socket.on('signal-answer', ({ targetSocketId, answer, isScreenShare }) => {
    const responder = activeUsers.get(socket.id);
    if (!responder) return;

    io.to(targetSocketId).emit('signal-answer', {
      responderSocketId: socket.id,
      answer,
      isScreenShare: !!isScreenShare
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('signal-ice', ({ targetSocketId, candidate, isScreenShare }) => {
    io.to(targetSocketId).emit('signal-ice', {
      senderSocketId: socket.id,
      candidate,
      isScreenShare: !!isScreenShare
    });
  });

  // Voice state updates (Mute, Deafen, Speaking, ScreenSharing)
  socket.on('voice-state-change', (changes) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    Object.assign(user, changes);

    // Broadcast to room
    io.to(user.roomCode).emit('user-voice-state-updated', {
      socketId: socket.id,
      changes
    });
  });

  // Chat: Send text message
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
      text: text.trim(),
      timestamp: Date.now(),
      isDirect: !!isDirect,
      recipientSocketId: recipientSocketId || null
    };

    if (isDirect && recipientSocketId) {
      // Send only to sender and recipient
      socket.emit('new-message', message);
      io.to(recipientSocketId).emit('new-message', message);
    } else {
      // Channel message: persist to room
      const room = appState.rooms[user.roomCode];
      if (room) {
        if (!room.messages) room.messages = [];
        room.messages.push(message);
        // Limit messages history in memory
        if (room.messages.length > 500) {
          room.messages = room.messages.slice(-500);
        }
        saveData();
      }
      io.to(user.roomCode).emit('new-message', message);
    }
  });

  // Heartbeat / Ping check
  socket.on('ping-measure', (timestamp, callback) => {
    if (typeof callback === 'function') {
      callback();
    }
    const user = activeUsers.get(socket.id);
    if (user && typeof timestamp === 'number') {
      const now = Date.now();
      user.ping = Math.max(1, now - timestamp);
      io.to(user.roomCode).emit('user-ping-updated', {
        socketId: socket.id,
        ping: user.ping
      });
    }
  });

  // Disconnect
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

      console.log(`[Socket] User disconnected: ${user.username} (${socket.id})`);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] «Круг» server running on http://0.0.0.0:${PORT}`);
});
