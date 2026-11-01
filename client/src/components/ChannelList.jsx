import React from 'react';
import {
  Hash,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  Monitor,
  Settings,
  PhoneOff,
  Radio,
  ChevronDown,
  Globe
} from 'lucide-react';

export default function ChannelList({
  room,
  users = [],
  currentUser,
  currentChannel,
  onSelectChannel,
  activeVoiceChannel,
  onJoinVoice,
  onLeaveVoice,
  isMuted,
  onToggleMute,
  isDeafened,
  onToggleDeafen,
  isScreenSharing,
  onToggleScreenShare,
  onOpenSettings,
  onOpenInviteModal,
  publicTunnelUrl,
  ping
}) {
  const textChannels = room?.textChannels || [
    { id: 'general', name: 'общий' },
    { id: 'gaming', name: 'игры' }
  ];

  const voiceChannels = room?.voiceChannels || [
    { id: 'voice-main', name: 'Общий голосовой' },
    { id: 'voice-room1', name: 'Комната отдыха' },
    { id: 'voice-gaming', name: 'Сквад / Катка' }
  ];

  const getVoiceUsers = (voiceId) => {
    let list = users.filter(u => u.currentVoiceChannel === voiceId);
    if (activeVoiceChannel === voiceId && currentUser && !list.some(u => (u.socketId && u.socketId === currentUser.socketId) || u.username === currentUser.username)) {
      list = [{ ...currentUser, currentVoiceChannel: voiceId }, ...list];
    }
    return list;
  };

  return (
    <div className="w-64 bg-[#2b2d31] flex flex-col justify-between border-r border-[#232428] select-none h-full">
      {/* Room Header & Public Tunnel Status */}
      <div className="border-b border-[#1f2023]">
        <div
          onClick={onOpenInviteModal}
          className="h-12 px-4 flex items-center justify-between font-semibold text-[#f2f3f5] hover:bg-[#35373c] transition-colors cursor-pointer shadow-sm"
        >
          <span className="truncate">{room?.name || 'Круг'}</span>
          <ChevronDown className="w-4 h-4 text-[#949ba4]" />
        </div>

        {/* Worldwide access banner */}
        {publicTunnelUrl && (
          <div
            onClick={onOpenInviteModal}
            className="px-3 py-1 bg-[#5865f2]/10 hover:bg-[#5865f2]/20 cursor-pointer flex items-center justify-between text-[11px] text-[#5865f2] border-t border-[#232428] transition-colors"
            title="Нажмите, чтобы скопировать ссылку для друзей из любой страны"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-[#23a55a]" />
              <span className="truncate font-medium">Онлайн по всему миру</span>
            </div>
            <span className="text-[10px] bg-[#5865f2]/30 px-1.5 py-0.2 rounded font-semibold text-white">
              Линк
            </span>
          </div>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Text Channels */}
        <div>
          <div className="px-2 pb-1 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">
            Текстовые каналы
          </div>
          <div className="space-y-0.5">
            {textChannels.map((ch) => {
              const isActive = currentChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-[#35373c] text-white font-medium'
                      : 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]'
                  }`}
                >
                  <Hash className="w-4 h-4 text-[#80848e]" />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Channels */}
        <div>
          <div className="px-2 pb-1 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">
            Голосовые каналы
          </div>
          <div className="space-y-1">
            {voiceChannels.map((vc) => {
              const inThisVoice = activeVoiceChannel === vc.id;
              const channelUsers = getVoiceUsers(vc.id);

              return (
                <div key={vc.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (!inThisVoice) onJoinVoice(vc.id);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors text-left ${
                      inThisVoice
                        ? 'bg-[#35373c] text-[#23a55a] font-medium'
                        : 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Volume2 className={`w-4 h-4 ${inThisVoice ? 'text-[#23a55a]' : 'text-[#80848e]'}`} />
                      <span className="truncate">{vc.name}</span>
                    </div>
                    {channelUsers.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e1f22] text-[#949ba4] font-semibold">
                        {channelUsers.length}
                      </span>
                    )}
                  </button>

                  {/* Users inside this voice channel (Avatar + Nickname list) */}
                  {channelUsers.length > 0 && (
                    <div className="pl-4 pr-1 space-y-1 pt-0.5 pb-1">
                      {channelUsers.map((u) => {
                        const isSpeaking = u.isSpeaking;
                        return (
                          <div
                            key={u.socketId}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                              isSpeaking
                                ? 'bg-[#23a55a]/15 text-white font-semibold ring-1 ring-[#23a55a]/40 shadow-sm'
                                : 'text-[#dbdee1] hover:bg-[#35373c]/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {/* Avatar */}
                              <div className="relative flex-shrink-0">
                                {u.avatarUrl ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.username}
                                    className={`w-6 h-6 rounded-full object-cover transition-all ${
                                      isSpeaking
                                        ? 'ring-2 ring-[#23a55a] shadow-[0_0_10px_#23a55a] scale-110'
                                        : ''
                                    }`}
                                  />
                                ) : (
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-all ${
                                      isSpeaking
                                        ? 'ring-2 ring-[#23a55a] shadow-[0_0_10px_#23a55a] scale-110'
                                        : ''
                                    }`}
                                    style={{ backgroundColor: u.avatarColor || '#5865f2' }}
                                  >
                                    {(u.username || 'Г').slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <span className={`truncate text-xs ${isSpeaking ? 'text-[#23a55a] font-bold' : 'text-[#dbdee1]'}`}>
                                {u.username} {u.socketId === currentUser?.socketId && <span className="text-[10px] text-[#949ba4] font-normal">(Вы)</span>}
                              </span>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1.5 text-[#80848e]">
                              {isSpeaking && <Volume2 className="w-3.5 h-3.5 text-[#23a55a] animate-pulse" />}
                              {u.isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
                              {u.isDeafened && <Headphones className="w-3.5 h-3.5 text-[#f23f43]" />}
                              {u.isScreenSharing && <Monitor className="w-3.5 h-3.5 text-[#23a55a] animate-pulse" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Voice Connected Banner (if in voice channel) */}
      {activeVoiceChannel && (
        <div className="bg-[#232428] border-b border-[#1f2023] px-3 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#23a55a] animate-pulse" />
            <div>
              <div className="text-[#23a55a] font-semibold">Голос подключен</div>
              <div className="text-[10px] text-[#949ba4]">
                {ping ? `${ping} ms / WebRTC` : 'RTC активен'}
              </div>
            </div>
          </div>
          <button
            onClick={onLeaveVoice}
            className="p-1.5 rounded-md hover:bg-[#da373c] text-[#f23f43] hover:text-white transition-colors"
            title="Отключиться от звонка"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Bar at Bottom (Profile, Avatar, Mic/Deafen buttons) */}
      <div className="h-[54px] bg-[#232428] px-2 flex items-center justify-between">
        {/* User Profile */}
        <div
          onClick={onOpenSettings}
          className="flex items-center gap-2 truncate pr-1 hover:bg-[#35373c]/60 p-1 rounded-md cursor-pointer transition-colors"
          title="Настройки профиля и аватара"
        >
          <div className="relative flex-shrink-0">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className={`w-8 h-8 rounded-full object-cover transition-all ${
                  currentUser?.isSpeaking ? 'ring-2 ring-[#23a55a] shadow-[0_0_10px_#23a55a]' : ''
                }`}
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs transition-all ${
                  currentUser?.isSpeaking ? 'ring-2 ring-[#23a55a] shadow-[0_0_10px_#23a55a]' : ''
                }`}
                style={{ backgroundColor: currentUser?.avatarColor || '#5865f2' }}
              >
                {(currentUser?.username || 'Я').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#232428] ${
              currentUser?.isSpeaking ? 'bg-[#23a55a] animate-pulse ring-1 ring-white' : 'bg-[#23a55a]'
            }`} />
          </div>

          <div className="truncate">
            <div className={`text-xs font-semibold truncate transition-colors ${
              currentUser?.isSpeaking ? 'text-[#23a55a] font-bold' : 'text-[#f2f3f5]'
            }`}>
              {currentUser?.username || 'Гость'}
            </div>
            <div className="text-[10px] text-[#949ba4] truncate">
              {currentUser?.isSpeaking ? 'Говорит...' : 'В сети'}
            </div>
          </div>
        </div>

        {/* Media Buttons */}
        <div className="flex items-center gap-0.5 text-[#b5bac1]">
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-md hover:bg-[#35373c] transition-colors ${
              isMuted ? 'text-[#f23f43] bg-[#35373c]/60' : 'hover:text-[#dbdee1]'
            }`}
            title={isMuted ? "Включить микрофон" : "Заглушить микрофон"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleDeafen}
            className={`p-1.5 rounded-md hover:bg-[#35373c] transition-colors ${
              isDeafened ? 'text-[#f23f43] bg-[#35373c]/60' : 'hover:text-[#dbdee1]'
            }`}
            title={isDeafened ? "Включить звук" : "Заглушить звук (деф)"}
          >
            <Headphones className="w-4 h-4" />
          </button>

          {activeVoiceChannel && (
            <button
              onClick={onToggleScreenShare}
              className={`p-1.5 rounded-md hover:bg-[#35373c] transition-colors ${
                isScreenSharing ? 'text-[#23a55a] bg-[#35373c]/60' : 'hover:text-[#dbdee1]'
              }`}
              title={isScreenSharing ? "Остановить стрим экрана" : "Демонстрация экрана"}
            >
              <Monitor className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors"
            title="Настройки звука и профиля"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
