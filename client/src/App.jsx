import React, { useState, useEffect, useRef } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import ChannelList from './components/ChannelList';
import VoiceGrid from './components/VoiceGrid';
import ChatArea from './components/ChatArea';
import UserList from './components/UserList';
import SettingsModal from './components/SettingsModal';
import ScreenShareModal from './components/ScreenShareModal';
import InviteModal from './components/InviteModal';
import JoinModal from './components/JoinModal';

import { socket, connectSocket, disconnectSocket, getServerUrl } from './services/socket';
import { WebRTCManager } from './services/webrtc';
import { AudioVAD } from './services/audioVAD';
import { sounds } from './services/sounds';

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState('room');
  const [centerMode, setCenterMode] = useState('chat');
  const [currentChannel, setCurrentChannel] = useState('general');
  const [isUserListOpen, setIsUserListOpen] = useState(true);

  // Room & Users state
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [publicTunnelUrl, setPublicTunnelUrl] = useState(null);

  // Messages state
  const [messages, setMessages] = useState([]);

  // Audio / Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentMicVolume, setCurrentMicVolume] = useState(0);

  // Streams
  const [localAudioStream, setLocalAudioStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState(new Map());

  // Network & Health
  const [ping, setPing] = useState(0);

  // Audio Settings
  const [audioSettings, setAudioSettings] = useState({
    inputMode: 'vad',
    vadThreshold: 0.03,
    pttKey: 'ControlRight',
    selectedInputDevice: '',
    selectedOutputDevice: ''
  });

  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScreenShareModalOpen, setIsScreenShareModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // References
  const rtcManagerRef = useRef(null);
  const vadRef = useRef(null);
  const remoteAudiosRef = useRef(new Map());
  const isPttPressedRef = useRef(false);

  // --- INITIALIZE WEBRTC & SOCKET ---
  useEffect(() => {
    connectSocket();

    // Check tunnel info from server
    fetch(`${getServerUrl()}/api/tunnel`)
      .then(r => r.json())
      .then(d => {
        if (d.publicTunnelUrl) setPublicTunnelUrl(d.publicTunnelUrl);
      })
      .catch(() => {});

    // Create WebRTC Manager
    const rtcManager = new WebRTCManager({
      socket,
      onRemoteAudioStream: (socketId, stream) => {
        let audioEl = remoteAudiosRef.current.get(socketId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          remoteAudiosRef.current.set(socketId, audioEl);
        }
        audioEl.srcObject = stream;
        audioEl.muted = isDeafened;
        audioEl.play().catch(e => console.warn('Audio play delayed:', e));
      },
      onRemoteAudioEnded: (socketId) => {
        const audioEl = remoteAudiosRef.current.get(socketId);
        if (audioEl) {
          audioEl.srcObject = null;
          audioEl.remove();
          remoteAudiosRef.current.delete(socketId);
        }
      },
      onRemoteScreenStream: (socketId, stream) => {
        setRemoteScreenStreams(prev => {
          const next = new Map(prev);
          next.set(socketId, stream);
          return next;
        });
        setCenterMode('voice');
      },
      onRemoteScreenEnded: (socketId) => {
        setRemoteScreenStreams(prev => {
          const next = new Map(prev);
          if (socketId) {
            next.delete(socketId);
          } else {
            next.clear();
          }
          return next;
        });
      },
      onStatsUpdate: (stats) => {
        if (stats.rtt) setPing(stats.rtt);
      }
    });

    rtcManagerRef.current = rtcManager;

    // Socket Event Handlers
    socket.on('room-joined', ({ room, users, iceServers, currentUser, publicTunnelUrl: tunnelUrl }) => {
      setRoom(room);
      setUsers(users);
      setCurrentUser(currentUser);
      setIsJoinModalOpen(false);
      if (tunnelUrl) setPublicTunnelUrl(tunnelUrl);
      rtcManager.setIceServers(iceServers);
      if (room.messages) setMessages(room.messages);
    });

    socket.on('user-joined-room', (user) => {
      setUsers(prev => [...prev.filter(u => u.socketId !== user.socketId), user]);
    });

    socket.on('user-left-room', ({ socketId }) => {
      setUsers(prev => prev.filter(u => u.socketId !== socketId));
      rtcManager.closeVoicePeer(socketId);
    });

    socket.on('user-joined-voice', ({ user, channelId }) => {
      setUsers(prev => {
        const exists = prev.some(u => u.socketId === user.socketId);
        if (exists) {
          return prev.map(u => u.socketId === user.socketId ? { ...u, currentVoiceChannel: channelId } : u);
        }
        return [...prev, { ...user, currentVoiceChannel: channelId }];
      });
      setCurrentUser(prev => (prev && prev.socketId === user.socketId) ? { ...prev, currentVoiceChannel: channelId } : prev);
      sounds.playJoin();
    });

    socket.on('user-left-voice', ({ socketId }) => {
      setUsers(prev => prev.map(u => u.socketId === socketId ? { ...u, currentVoiceChannel: null, isSpeaking: false, isScreenSharing: false } : u));
      setCurrentUser(prev => (prev && prev.socketId === socketId) ? { ...prev, currentVoiceChannel: null, isSpeaking: false, isScreenSharing: false } : prev);
      rtcManager.closeVoicePeer(socketId);
      sounds.playLeave();
    });

    socket.on('voice-channel-peers', ({ channelId, peers }) => {
      rtcManager.connectToVoicePeers(peers);
    });

    socket.on('user-voice-state-updated', ({ socketId, changes }) => {
      setUsers(prev => prev.map(u => u.socketId === socketId ? { ...u, ...changes } : u));
      if (socketId === currentUser?.socketId) {
        setCurrentUser(prev => prev ? { ...prev, ...changes } : prev);
      }
    });

    socket.on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('user-ping-updated', ({ socketId, ping }) => {
      setUsers(prev => prev.map(u => u.socketId === socketId ? { ...u, ping } : u));
    });

    // Ping loop
    const pingTimer = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('ping-measure', start, () => {
          setPing(Date.now() - start);
        });
      }
    }, 4000);

    return () => {
      clearInterval(pingTimer);
      disconnectSocket();
      rtcManager.cleanupAll();
    };
  }, []);

  // Update Deafened state on all remote audio tags
  useEffect(() => {
    remoteAudiosRef.current.forEach(audioEl => {
      audioEl.muted = isDeafened;
    });
  }, [isDeafened]);

  // Microphone init
  const initMicrophone = async () => {
    try {
      const constraints = {
        audio: {
          deviceId: audioSettings.selectedInputDevice ? { exact: audioSettings.selectedInputDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalAudioStream(stream);

      if (rtcManagerRef.current) {
        rtcManagerRef.current.setLocalAudioStream(stream);
      }

      if (vadRef.current) {
        vadRef.current.stop();
      }

      const vad = new AudioVAD({
        stream,
        threshold: audioSettings.vadThreshold,
        onSpeakingChange: (speaking) => {
          if (audioSettings.inputMode === 'vad' && !isMuted) {
            // Immediate local update so user avatar and card glow without roundtrip delay
            setCurrentUser(prev => prev ? { ...prev, isSpeaking: speaking } : prev);
            setUsers(prev => prev.map(u => u.socketId === currentUser?.socketId ? { ...u, isSpeaking: speaking } : u));
            socket.emit('voice-state-change', { isSpeaking: speaking });
          }
        },
        onVolumeChange: (vol) => {
          setCurrentMicVolume(vol);
        }
      });
      vadRef.current = vad;
      return stream;
    } catch (err) {
      console.error('[App] Mic error:', err);
      return null;
    }
  };

  // Join Room
  const handleJoinRoom = ({ username, roomCode, password, avatarUrl }) => {
    socket.emit('join-room', {
      roomCode,
      password,
      user: {
        username,
        avatarColor: currentUser?.avatarColor || '#5865f2',
        avatarUrl: avatarUrl || currentUser?.avatarUrl || null
      }
    });
  };

  // Join / Leave Voice
  const handleJoinVoice = async (channelId) => {
    setActiveVoiceChannel(channelId);
    setCenterMode('voice');
    sounds.playJoin();

    // Optimistically update local user state so 1 large card immediately renders
    setCurrentUser(prev => prev ? { ...prev, currentVoiceChannel: channelId } : prev);
    setUsers(prev => {
      const exists = prev.some(u => (u.socketId && u.socketId === currentUser?.socketId) || (u.username && u.username === currentUser?.username));
      if (exists) {
        return prev.map(u => ((u.socketId && u.socketId === currentUser?.socketId) || (u.username && u.username === currentUser?.username))
          ? { ...u, currentVoiceChannel: channelId }
          : u
        );
      }
      if (currentUser) {
        return [...prev, { ...currentUser, currentVoiceChannel: channelId }];
      }
      return prev;
    });

    if (!localAudioStream) {
      await initMicrophone();
    }

    socket.emit('join-voice', { channelId });
    rtcManagerRef.current?.startStatsMonitor();
  };

  const handleLeaveVoice = () => {
    sounds.playLeave();
    if (isScreenSharing) {
      handleStopScreenShare();
    }
    setActiveVoiceChannel(null);
    setCenterMode('chat');

    setCurrentUser(prev => prev ? { ...prev, currentVoiceChannel: null, isSpeaking: false, isScreenSharing: false } : prev);
    setUsers(prev => prev.map(u => ((u.socketId && u.socketId === currentUser?.socketId) || (u.username && u.username === currentUser?.username))
      ? { ...u, currentVoiceChannel: null, isSpeaking: false, isScreenSharing: false }
      : u
    ));

    socket.emit('leave-voice');
    rtcManagerRef.current?.cleanupAll();
  };

  // Mute & Deafen with Discord sounds
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
      sounds.playMute();
    } else {
      sounds.playUnmute();
    }

    if (localAudioStream) {
      localAudioStream.getAudioTracks().forEach(t => t.enabled = !nextMuted);
    }

    socket.emit('voice-state-change', {
      isMuted: nextMuted,
      isSpeaking: nextMuted ? false : undefined
    });
  };

  const handleToggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    if (nextDeafened) {
      sounds.playMute();
      if (!isMuted) handleToggleMute();
    } else {
      sounds.playUnmute();
    }

    socket.emit('voice-state-change', { isDeafened: nextDeafened });
  };

  // Screen Sharing
  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      handleStopScreenShare();
    } else {
      setIsScreenShareModalOpen(true);
    }
  };

  const handleStartScreenShareWithStream = (stream) => {
    setLocalScreenStream(stream);
    setIsScreenSharing(true);
    setCenterMode('voice');

    const channelUsers = users.filter(u => u.currentVoiceChannel === activeVoiceChannel && u.socketId !== socket.id);
    rtcManagerRef.current?.startScreenShare(stream, channelUsers);

    socket.emit('voice-state-change', { isScreenSharing: true });

    stream.getVideoTracks()[0].onended = () => {
      handleStopScreenShare();
    };
  };

  const handleStopScreenShare = () => {
    rtcManagerRef.current?.stopScreenShare();
    setLocalScreenStream(null);
    setIsScreenSharing(false);
    socket.emit('voice-state-change', { isScreenSharing: false });
  };

  // Push-to-Talk
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (audioSettings.inputMode === 'ptt' && e.code === audioSettings.pttKey && !isPttPressedRef.current) {
        isPttPressedRef.current = true;
        if (!isMuted && localAudioStream) {
          localAudioStream.getAudioTracks().forEach(t => t.enabled = true);
          socket.emit('voice-state-change', { isSpeaking: true });
        }
      }
    };

    const handleKeyUp = (e) => {
      if (audioSettings.inputMode === 'ptt' && e.code === audioSettings.pttKey) {
        isPttPressedRef.current = false;
        if (localAudioStream) {
          localAudioStream.getAudioTracks().forEach(t => t.enabled = false);
          socket.emit('voice-state-change', { isSpeaking: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (window.electronAPI?.onGlobalPttChange) {
      window.electronAPI.onGlobalPttChange(({ pressed }) => {
        if (audioSettings.inputMode === 'ptt') {
          if (pressed && !isMuted && localAudioStream) {
            localAudioStream.getAudioTracks().forEach(t => t.enabled = true);
            socket.emit('voice-state-change', { isSpeaking: true });
          } else if (!pressed && localAudioStream) {
            localAudioStream.getAudioTracks().forEach(t => t.enabled = false);
            socket.emit('voice-state-change', { isSpeaking: false });
          }
        }
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioSettings, isMuted, localAudioStream]);

  // Send Message
  const handleSendMessage = (text) => {
    socket.emit('send-message', {
      channelId: currentChannel,
      text
    });
  };

  const currentMessages = messages.filter(m => m.channelId === currentChannel);
  let voiceUsers = users.filter(u => u.currentVoiceChannel === activeVoiceChannel);
  if (activeVoiceChannel && currentUser && !voiceUsers.some(u => (u.socketId && u.socketId === currentUser.socketId) || (u.username && u.username === currentUser.username))) {
    voiceUsers = [{ ...currentUser, currentVoiceChannel: activeVoiceChannel }, ...voiceUsers];
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1e1f22]">
      <TitleBar roomCode={room?.code} ping={ping} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          room={room}
          onOpenInviteModal={() => setIsInviteModalOpen(true)}
          onOpenJoinModal={() => setIsJoinModalOpen(true)}
        />

        <ChannelList
          room={room}
          users={users}
          currentUser={currentUser}
          currentChannel={currentChannel}
          onSelectChannel={(chId) => {
            setCurrentChannel(chId);
            setCenterMode('chat');
          }}
          activeVoiceChannel={activeVoiceChannel}
          onJoinVoice={handleJoinVoice}
          onLeaveVoice={handleLeaveVoice}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isDeafened={isDeafened}
          onToggleDeafen={handleToggleDeafen}
          isScreenSharing={isScreenSharing}
          onToggleScreenShare={handleToggleScreenShare}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenInviteModal={() => setIsInviteModalOpen(true)}
          publicTunnelUrl={publicTunnelUrl}
          ping={ping}
        />

        {/* Center View */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeVoiceChannel && (
            <div className="h-9 bg-[#232428] border-b border-[#1f2023] px-4 flex items-center justify-between text-xs z-10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCenterMode('voice')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    centerMode === 'voice'
                      ? 'bg-[#5865f2] text-white shadow-sm'
                      : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                  }`}
                >
                  Голосовая сетка ({voiceUsers.length})
                </button>
                <button
                  onClick={() => setCenterMode('chat')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    centerMode === 'chat'
                      ? 'bg-[#5865f2] text-white shadow-sm'
                      : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                  }`}
                >
                  Текстовый чат #{currentChannel}
                </button>
              </div>

              {publicTunnelUrl && (
                <div
                  onClick={() => setIsInviteModalOpen(true)}
                  className="text-[11px] text-[#23a55a] font-medium cursor-pointer hover:underline hidden sm:flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-ping" />
                  <span>Туннель активен</span>
                </div>
              )}
            </div>
          )}

          {centerMode === 'voice' && activeVoiceChannel ? (
            <VoiceGrid
              voiceChannelName={room?.voiceChannels?.find(v => v.id === activeVoiceChannel)?.name}
              voiceUsers={voiceUsers}
              currentUser={currentUser}
              localScreenStream={localScreenStream}
              remoteScreenStreams={remoteScreenStreams}
              onStopScreenShare={handleStopScreenShare}
            />
          ) : (
            <ChatArea
              channelName={currentChannel}
              messages={currentMessages}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
              onToggleUserList={() => setIsUserListOpen(!isUserListOpen)}
              isUserListOpen={isUserListOpen}
            />
          )}
        </main>

        {isUserListOpen && (
          <UserList
            users={users}
            currentUser={currentUser}
            onStartDirectMessage={(user) => console.log('DM', user)}
          />
        )}
      </div>

      {/* Modals */}
      <JoinModal
        isOpen={isJoinModalOpen}
        onJoin={handleJoinRoom}
        defaultRoomCode="krug-main"
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={(updates) => {
          setCurrentUser(prev => ({ ...prev, ...updates }));
          socket.emit('voice-state-change', updates);
        }}
        audioSettings={audioSettings}
        onUpdateAudioSettings={(updates) => {
          setAudioSettings(prev => ({ ...prev, ...updates }));
          if (updates.vadThreshold !== undefined && vadRef.current) {
            vadRef.current.setThreshold(updates.vadThreshold);
          }
        }}
        currentMicVolume={currentMicVolume}
        publicTunnelUrl={publicTunnelUrl}
      />

      <ScreenShareModal
        isOpen={isScreenShareModalOpen}
        onClose={() => setIsScreenShareModalOpen(false)}
        onSelectSource={handleStartScreenShareWithStream}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        room={room}
        publicTunnelUrl={publicTunnelUrl}
      />
    </div>
  );
}
