import React, { useState } from 'react';
import { MicOff, Headphones, Monitor, Volume2, Maximize2, Minimize2 } from 'lucide-react';

export default function VoiceGrid({
  voiceChannelName,
  voiceUsers = [],
  currentUser,
  localScreenStream,
  remoteScreenStreams = new Map(),
  onStopScreenShare
}) {
  const [fullscreenItemId, setFullscreenItemId] = useState(null);

  // Compile all entities in call: participants + screen shares
  const tiles = [];

  // 1. Participant tiles
  voiceUsers.forEach((user) => {
    tiles.push({
      type: 'user',
      id: `user-${user.socketId}`,
      user: user,
      isMe: user.socketId === currentUser?.socketId
    });
  });

  // 2. Local screen share tile
  if (localScreenStream) {
    tiles.push({
      type: 'screen',
      id: 'screen-local',
      stream: localScreenStream,
      ownerName: currentUser?.username || 'Вы',
      isLocal: true
    });
  }

  // 3. Remote screen share tiles
  remoteScreenStreams.forEach((stream, socketId) => {
    const owner = voiceUsers.find(u => u.socketId === socketId);
    tiles.push({
      type: 'screen',
      id: `screen-${socketId}`,
      stream: stream,
      ownerName: owner?.username || 'Стрим',
      isLocal: false
    });
  });

  const count = tiles.length;

  // Grid layout class based on number of tiles
  // Exactly tailored for 2 people: 1 person = 1 card, 2 people = 2 equal cards!
  const getGridConfig = () => {
    if (count <= 1) {
      return 'grid-cols-1 max-w-3xl h-[70vh]';
    }
    if (count === 2) {
      return 'grid-cols-1 md:grid-cols-2 max-w-5xl h-[72vh]';
    }
    if (count <= 4) {
      return 'grid-cols-1 sm:grid-cols-2 max-w-6xl h-[78vh]';
    }
    if (count <= 6) {
      return 'grid-cols-2 md:grid-cols-3 max-w-7xl h-[82vh]';
    }
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-full';
  };

  return (
    <div className="flex-1 bg-[#1e1f22] p-4 flex flex-col items-center justify-center overflow-hidden relative select-none">
      {/* Voice Room Status Bar */}
      <div className="w-full flex items-center justify-between px-3 pb-2.5 text-xs text-[#949ba4] border-b border-[#232428] mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-pulse" />
          <span className="font-bold text-white text-sm">{voiceChannelName || 'Голосовой канал'}</span>
          <span className="px-2 py-0.5 rounded-full bg-[#2b2d31] text-[11px] text-[#dbdee1] font-semibold">
            {voiceUsers.length} {voiceUsers.length === 1 ? 'участник' : 'участника'}
          </span>
        </div>

        <div className="text-[11px] text-[#80848e] hidden sm:block">
          Голосовая сцена Discord (Прямая WebRTC связь)
        </div>
      </div>

      {/* Grid of Square / Rectangle Tiles */}
      <div
        className={`w-full grid gap-4 items-center justify-center p-2 ${getGridConfig()}`}
      >
        {tiles.map((tile) => {
          // SCREEN SHARE TILE
          if (tile.type === 'screen') {
            return (
              <ScreenTile
                key={tile.id}
                stream={tile.stream}
                ownerName={tile.ownerName}
                isLocal={tile.isLocal}
                onStop={tile.isLocal ? onStopScreenShare : null}
                isFullscreen={fullscreenItemId === tile.id}
                onToggleFullscreen={() =>
                  setFullscreenItemId(fullscreenItemId === tile.id ? null : tile.id)
                }
              />
            );
          }

          // USER PARTICIPANT TILE
          const user = tile.user;
          const isSpeaking = user.isSpeaking;

          return (
            <div
              key={tile.id}
              className={`w-full h-full min-h-[220px] bg-[#2b2d31] rounded-2xl flex flex-col items-center justify-center relative group border-2 transition-all duration-150 shadow-xl overflow-hidden ${
                isSpeaking
                  ? 'border-[#23a55a] ring-4 ring-[#23a55a]/40 shadow-[0_0_25px_rgba(35,165,90,0.5)]'
                  : 'border-[#1f2023] hover:border-[#35373c]'
              }`}
            >
              {/* Avatar in Center */}
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className={`rounded-full object-cover transition-all duration-150 shadow-lg ${
                      count <= 2 ? 'w-28 h-28 md:w-32 md:h-32' : 'w-20 h-20'
                    } ${isSpeaking ? 'ring-4 ring-[#23a55a] scale-105' : ''}`}
                  />
                ) : (
                  <div
                    className={`rounded-full flex items-center justify-center font-bold text-white transition-all duration-150 shadow-lg ${
                      count <= 2 ? 'w-28 h-28 md:w-32 md:h-32 text-4xl' : 'w-20 h-20 text-2xl'
                    } ${isSpeaking ? 'ring-4 ring-[#23a55a] scale-105' : ''}`}
                    style={{ backgroundColor: user.avatarColor || '#5865f2' }}
                  >
                    {(user.username || 'Г').slice(0, 1).toUpperCase()}
                  </div>
                )}

                {/* Speaking indicator icon */}
                {isSpeaking && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#23a55a] border-2 border-[#2b2d31] flex items-center justify-center shadow-md">
                    <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
                  </span>
                )}
              </div>

              {/* Bottom Card Bar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white bg-[#111214]/75 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/5 shadow-md">
                <span className="truncate font-semibold flex items-center gap-1.5">
                  {user.username} {tile.isMe && <span className="text-[#949ba4] font-normal">(Вы)</span>}
                </span>

                <div className="flex items-center gap-1.5 text-[#949ba4]">
                  {user.isMuted && <MicOff className="w-4 h-4 text-[#f23f43]" />}
                  {user.isDeafened && <Headphones className="w-4 h-4 text-[#f23f43]" />}
                  {user.isScreenSharing && <Monitor className="w-4 h-4 text-[#23a55a] animate-pulse" />}
                  {user.ping > 0 && <span className="text-[10px] text-[#949ba4] font-mono">{user.ping}ms</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// SCREEN SHARE TILE (ДЕМОНСТРАЦИЯ ЭКРАНА В СЕТКЕ)
function ScreenTile({ stream, ownerName, isLocal, onStop, isFullscreen, onToggleFullscreen }) {
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => console.warn('Screen video play:', err));
    }
  }, [stream]);

  return (
    <div
      className={`w-full h-full min-h-[220px] bg-black rounded-2xl relative group border-2 border-[#23a55a]/70 shadow-2xl overflow-hidden flex items-center justify-center ${
        isFullscreen ? 'fixed inset-4 z-50 min-h-none' : ''
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-contain select-none"
      />

      {/* Top Stream Badge */}
      <div className="absolute top-3 left-3 bg-[#111214]/85 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 text-xs text-white z-10 border border-white/10 shadow-md">
        <Monitor className="w-3.5 h-3.5 text-[#23a55a]" />
        <span className="font-semibold">{ownerName}</span>
        <span className="text-[10px] bg-[#23a55a] text-black font-bold px-1.5 py-0.2 rounded">
          В ЭФИРЕ
        </span>
      </div>

      {/* Controls on hover */}
      <div className="absolute bottom-3 right-3 bg-[#111214]/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-white/10 shadow-md">
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
          title={isFullscreen ? "Свернуть в плитку" : "Развернуть во весь экран"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {isLocal && onStop && (
          <button
            onClick={onStop}
            className="px-3 py-1 rounded-lg bg-[#da373c] hover:bg-[#ba272c] text-white text-xs font-semibold transition-colors"
          >
            Остановить стрим
          </button>
        )}
      </div>
    </div>
  );
}
