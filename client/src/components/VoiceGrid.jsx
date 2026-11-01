import React, { useState, useEffect, useRef } from 'react';
import {
  MicOff,
  Headphones,
  Monitor,
  Volume2,
  Maximize2,
  Minimize2,
  Radio,
  Tv,
  StopCircle
} from 'lucide-react';

export default function VoiceGrid({
  voiceChannelName,
  voiceUsers = [],
  currentUser,
  localScreenStream,
  remoteScreenStreams = new Map(),
  onStopScreenShare
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Identify active screen shares
  const screenShares = [];
  if (localScreenStream) {
    screenShares.push({
      id: 'local',
      stream: localScreenStream,
      ownerName: currentUser?.username || 'Вы',
      isLocal: true
    });
  }
  remoteScreenStreams.forEach((stream, socketId) => {
    const owner = voiceUsers.find(u => u.socketId === socketId);
    screenShares.push({
      id: socketId,
      stream,
      ownerName: owner?.username || 'Стрим друга',
      isLocal: false
    });
  });

  const activeStream = screenShares.length > 0 ? screenShares[0] : null;

  // Guarantee that if currentUser is in voice, they are always displayed (never 0 users)
  const displayUsers = [...voiceUsers];
  if (currentUser && !displayUsers.some(u => (u.socketId && u.socketId === currentUser.socketId) || (u.username && u.username === currentUser.username))) {
    displayUsers.unshift({
      ...currentUser,
      currentVoiceChannel: voiceChannelName
    });
  }
  const count = displayUsers.length;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {
        setIsFullscreen(true);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-[#1e1f22] flex flex-col justify-between overflow-hidden relative select-none ${
        isFullscreen ? 'fixed inset-0 z-50 p-4' : 'p-3'
      }`}
    >
      {/* Top Status Header */}
      <div className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#949ba4] border-b border-[#232428] mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-pulse" />
          <span className="font-bold text-white text-sm">{voiceChannelName || 'Общий голосовой'}</span>
          <span className="px-2 py-0.5 rounded-full bg-[#2b2d31] text-[11px] text-[#dbdee1] font-semibold">
            {count} {count === 1 ? 'участник' : 'участника'}
          </span>
          {activeStream && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#da373c] text-white text-[10px] font-bold tracking-wide uppercase shadow-sm animate-pulse">
              <Tv className="w-3 h-3" />
              В ЭФИРЕ: {activeStream.ownerName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {activeStream && (
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white transition-colors text-xs font-semibold"
              title={isFullscreen ? "Выйти из полноэкранного режима (Esc)" : "Развернуть на весь экран"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'Свернуть' : 'На весь экран'}</span>
            </button>
          )}

          <div className="text-[11px] text-[#80848e] hidden md:block">
            Discord Голосовая сцена
          </div>
        </div>
      </div>

      {/* --- SCENARIO A: SCREEN SHARE ACTIVE (IMAGE 2 LAYOUT) --- */}
      {activeStream ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 gap-3">
          {/* Main Hero Screen Share Player */}
          <div className="flex-1 bg-black rounded-2xl relative group border border-[#2b2d31] shadow-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
            <StreamVideo stream={activeStream.stream} isLocal={activeStream.isLocal} />

            {/* Top stream overlay badge */}
            <div className="absolute top-3 left-3 bg-[#111214]/80 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-white z-10 border border-white/10 shadow-lg">
              <span className="bg-[#da373c] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                В ЭФИРЕ
              </span>
              <span className="font-semibold">{activeStream.ownerName}</span>
            </div>

            {/* Top Right Fullscreen toggle */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-[#111214]/80 hover:bg-[#111214] backdrop-blur-md text-white transition-colors border border-white/10 shadow-lg"
                title={isFullscreen ? "Свернуть" : "Развернуть на весь экран"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {activeStream.isLocal && onStopScreenShare && (
                <button
                  onClick={onStopScreenShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#da373c] hover:bg-[#ba272c] text-white text-xs font-semibold shadow-lg transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Прекратить стрим</span>
                </button>
              )}
            </div>

            {/* Local Stream Friendly Message Overlay (Discord style) */}
            {activeStream.isLocal && (
              <div className="absolute bottom-4 left-4 bg-[#111214]/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs text-[#dbdee1] flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />
                <span>Вы транслируете свой экран друзьям</span>
              </div>
            )}
          </div>

          {/* Bottom Dock: Row of Rectangular Participant Cards (Just like Image 2!) */}
          <div className="h-32 flex-shrink-0 flex items-center justify-center gap-3 overflow-x-auto px-2 py-1 bg-[#111214]/40 rounded-2xl backdrop-blur-sm border border-[#232428]">
            {/* Stream Status Card in Dock */}
            {activeStream.isLocal && (
              <div className="w-48 h-28 bg-[#1e1f22] rounded-xl flex flex-col items-center justify-center p-2.5 relative border border-[#2b2d31] flex-shrink-0">
                <div className="bg-[#da373c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mb-1.5">
                  В ЭФИРЕ
                </div>
                <Tv className="w-6 h-6 text-[#5865f2] mb-1" />
                <span className="text-[11px] font-medium text-white text-center line-clamp-1">
                  Ваш стрим
                </span>
                <span className="text-[10px] text-[#949ba4]">Трансляция активна</span>
              </div>
            )}

            {/* Participant Rectangles */}
            {displayUsers.map((user) => {
              const isMe = (user.socketId && user.socketId === currentUser?.socketId) || user.username === currentUser?.username;
              const isSpeaking = user.isSpeaking || (isMe && currentUser?.isSpeaking);

              return (
                <div
                  key={user.socketId || user.username}
                  className={`w-48 h-28 bg-[#2b2d31] rounded-xl flex flex-col items-center justify-center relative flex-shrink-0 transition-all duration-150 border-2 overflow-hidden shadow-lg ${
                    isSpeaking
                      ? 'border-[#23a55a] ring-2 ring-[#23a55a]/60 shadow-[0_0_20px_rgba(35,165,90,0.5)]'
                      : 'border-[#1f2023] hover:border-[#35373c]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative mb-1">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className={`w-12 h-12 rounded-full object-cover transition-all ${
                          isSpeaking ? 'ring-2 ring-[#23a55a] scale-105' : ''
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm transition-all ${
                          isSpeaking ? 'ring-2 ring-[#23a55a] scale-105' : ''
                        }`}
                        style={{ backgroundColor: user.avatarColor || '#5865f2' }}
                      >
                        {(user.username || 'Г').slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    {isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#23a55a] border-2 border-[#2b2d31] flex items-center justify-center shadow-md">
                        <Volume2 className="w-2.5 h-2.5 text-white animate-pulse" />
                      </span>
                    )}
                  </div>

                  {/* Nickname & Status */}
                  <div className="w-full px-2 flex items-center justify-between text-[11px] text-[#dbdee1]">
                    <span className="truncate font-semibold max-w-[100px]">
                      {user.username} {isMe && <span className="text-[#949ba4] font-normal">(Вы)</span>}
                    </span>

                    <div className="flex items-center gap-1 text-[#80848e]">
                      {user.isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
                      {user.isDeafened && <Headphones className="w-3.5 h-3.5 text-[#f23f43]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* --- SCENARIO B: NO SCREEN SHARE (NORMAL 1 VS 2 USER STAGE GRID) --- */
        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
          <div
            className={`w-full h-full grid gap-4 items-center justify-center ${
              count <= 1
                ? 'grid-cols-1 max-w-2xl max-h-[70vh]'
                : count === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-5xl max-h-[72vh]'
                : 'grid-cols-2 max-w-6xl max-h-[78vh]'
            }`}
          >
            {displayUsers.map((user) => {
              const isMe = (user.socketId && user.socketId === currentUser?.socketId) || user.username === currentUser?.username;
              const isSpeaking = user.isSpeaking || (isMe && currentUser?.isSpeaking);

              return (
                <div
                  key={user.socketId || user.username}
                  className={`w-full h-full min-h-[240px] bg-[#2b2d31] rounded-2xl flex flex-col items-center justify-center relative group border-2 transition-all duration-150 shadow-2xl overflow-hidden ${
                    isSpeaking
                      ? 'border-[#23a55a] ring-4 ring-[#23a55a]/60 shadow-[0_0_30px_rgba(35,165,90,0.6)]'
                      : 'border-[#1f2023] hover:border-[#35373c]'
                  }`}
                >
                  {/* Central Large Avatar */}
                  <div className="relative">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className={`rounded-full object-cover transition-all duration-150 shadow-xl ${
                          count <= 1
                            ? 'w-32 h-32 md:w-36 md:h-36'
                            : 'w-24 h-24 md:w-28 md:h-28'
                        } ${
                          isSpeaking
                            ? 'ring-4 ring-[#23a55a] shadow-[0_0_20px_#23a55a] scale-105'
                            : ''
                        }`}
                      />
                    ) : (
                      <div
                        className={`rounded-full flex items-center justify-center font-bold text-white transition-all duration-150 shadow-xl ${
                          count <= 1
                            ? 'w-32 h-32 md:w-36 md:h-36 text-5xl'
                            : 'w-24 h-24 md:w-28 md:h-28 text-3xl'
                        } ${
                          isSpeaking
                            ? 'ring-4 ring-[#23a55a] shadow-[0_0_20px_#23a55a] scale-105'
                            : ''
                        }`}
                        style={{ backgroundColor: user.avatarColor || '#5865f2' }}
                      >
                        {(user.username || 'Г').slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    {/* Speaking Sound Icon */}
                    {isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#23a55a] border-2 border-[#2b2d31] flex items-center justify-center shadow-lg">
                        <Volume2 className="w-4 h-4 text-white animate-pulse" />
                      </span>
                    )}
                  </div>

                  {/* Bottom Card Pill (Discord Style) */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white bg-[#111214]/80 px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/5 shadow-md">
                    <span className={`truncate font-semibold flex items-center gap-1.5 ${isSpeaking ? 'text-[#23a55a]' : 'text-white'}`}>
                      {user.username} {isMe && <span className="text-[#949ba4] font-normal">(Вы)</span>}
                    </span>

                    <div className="flex items-center gap-1.5 text-[#949ba4]">
                      {isSpeaking && <Volume2 className="w-3.5 h-3.5 text-[#23a55a] animate-pulse" />}
                      {user.isMuted && <MicOff className="w-4 h-4 text-[#f23f43]" />}
                      {user.isDeafened && <Headphones className="w-4 h-4 text-[#f23f43]" />}
                      {user.isScreenSharing && <Monitor className="w-4 h-4 text-[#23a55a] animate-pulse" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// VIDEO PLAYER FOR SCREEN SHARE
function StreamVideo({ stream, isLocal }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.warn('Stream video play delayed:', err));
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="w-full h-full object-contain select-none"
    />
  );
}
