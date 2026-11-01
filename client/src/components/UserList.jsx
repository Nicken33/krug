import React from 'react';
import { MicOff, Headphones, Monitor, Volume2 } from 'lucide-react';

export default function UserList({
  users = [],
  currentUser,
  onStartDirectMessage
}) {
  const onlineUsers = users.filter(u => !u.currentVoiceChannel);
  const voiceUsers = users.filter(u => !!u.currentVoiceChannel);

  const renderUser = (user) => {
    const isMe = user.socketId === currentUser?.socketId;
    return (
      <div
        key={user.socketId}
        onClick={() => !isMe && onStartDirectMessage?.(user)}
        className={`flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#35373c]/60 cursor-pointer transition-colors group ${
          isMe ? 'opacity-95' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="relative flex-shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className={`w-8 h-8 rounded-full object-cover transition-all ${
                  user.isSpeaking ? 'ring-2 ring-[#23a55a] shadow-[0_0_8px_#23a55a]' : ''
                }`}
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                  user.isSpeaking ? 'ring-2 ring-[#23a55a] shadow-[0_0_8px_#23a55a]' : ''
                }`}
                style={{ backgroundColor: user.avatarColor || '#5865f2' }}
              >
                {user.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-[#2b2d31]" />
          </div>

          <div className="truncate">
            <div className="text-xs font-semibold text-[#dbdee1] group-hover:text-white truncate flex items-center gap-1.5">
              <span>{user.username}</span>
              {isMe && (
                <span className="text-[10px] text-[#949ba4] font-normal">(вы)</span>
              )}
            </div>
            <div className="text-[10px] text-[#949ba4]">В сети</div>
          </div>
        </div>

        {/* Status icons */}
        <div className="flex items-center gap-1 text-[#80848e]">
          {user.isSpeaking && <Volume2 className="w-3.5 h-3.5 text-[#23a55a] animate-pulse" />}
          {user.isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
          {user.isDeafened && <Headphones className="w-3.5 h-3.5 text-[#f23f43]" />}
          {user.isScreenSharing && <Monitor className="w-3.5 h-3.5 text-[#23a55a]" />}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-60 bg-[#2b2d31] p-3 overflow-y-auto border-l border-[#232428] select-none h-full hidden lg:block">
      {voiceUsers.length > 0 && (
        <div className="mb-4">
          <div className="px-2 pb-1.5 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">
            В голосовом канале — {voiceUsers.length}
          </div>
          <div className="space-y-0.5">{voiceUsers.map(renderUser)}</div>
        </div>
      )}

      <div>
        <div className="px-2 pb-1.5 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">
          В сети — {users.length}
        </div>
        <div className="space-y-0.5">{users.map(renderUser)}</div>
      </div>
    </aside>
  );
}
