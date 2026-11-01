import React, { useState, useEffect } from 'react';
import { LogIn, User, Hash, Globe, Radio, Upload } from 'lucide-react';
import { connectSocket } from '../services/socket';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Gamer1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NekoKitty',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowNinja'
];

export default function JoinModal({
  isOpen,
  onJoin,
  defaultRoomCode = 'krug-main'
}) {
  const [mode, setMode] = useState('host'); // 'host' | 'client'
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(defaultRoomCode);
  const [serverUrl, setServerUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const serverParam = params.get('server');

      if (roomParam) setRoomCode(roomParam);
      if (serverParam) {
        setServerUrl(serverParam);
        setMode('client');
      }
    }

    const savedName = localStorage.getItem('krug_username');
    if (savedName) setUsername(savedName);

    const savedAvatar = localStorage.getItem('krug_avatar_url');
    if (savedAvatar) setAvatarUrl(savedAvatar);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim()) return;

    localStorage.setItem('krug_username', username.trim());
    if (avatarUrl) localStorage.setItem('krug_avatar_url', avatarUrl);

    // If connecting to a remote server
    if (mode === 'client' && serverUrl.trim()) {
      let target = serverUrl.trim();
      if (!target.startsWith('http')) {
        target = 'https://' + target;
      }
      connectSocket(target);
    }

    onJoin({
      username: username.trim(),
      roomCode: roomCode.trim(),
      avatarUrl: avatarUrl || null
    });
  };

  return (
    <div className="fixed inset-0 bg-[#1e1f22] flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#313338] rounded-2xl shadow-2xl p-6 border border-[#232428] space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-lg mb-2">
            К
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Вход в «Круг»</h1>
          <p className="text-xs text-[#949ba4]">
            Голосовая связь, стримы экрана и чат для друзей
          </p>
        </div>

        {/* Mode Tabs: Host vs Join Friend */}
        <div className="grid grid-cols-2 gap-2 bg-[#2b2d31] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('host')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'host'
                ? 'bg-[#5865f2] text-white shadow-md'
                : 'text-[#949ba4] hover:text-white'
            }`}
          >
            Создать (Хост)
          </button>
          <button
            type="button"
            onClick={() => setMode('client')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'client'
                ? 'bg-[#5865f2] text-white shadow-md'
                : 'text-[#949ba4] hover:text-white'
            }`}
          >
            Войти к другу
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#5865f2]" />
              Ваш никнейм
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Как вас зовут (например, Alex)"
              className="w-full bg-[#1e1f22] text-white border border-[#232428] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#5865f2] transition-colors"
            />
          </div>

          {/* Quick Avatar selection */}
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1.5">
              Выберите аватарку
            </label>
            <div className="flex items-center gap-2">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform ${
                    avatarUrl === url ? 'border-[#23a55a] scale-110 ring-2 ring-[#23a55a]' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="av" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Friend Server URL (if in client mode) */}
          {mode === 'client' && (
            <div>
              <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#23a55a]" />
                Ссылка сервера друга (из любой страны)
              </label>
              <input
                type="text"
                required
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://xxxx.trycloudflare.com"
                className="w-full bg-[#1e1f22] text-white font-mono border border-[#232428] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#23a55a] transition-colors"
              />
              <span className="text-[10px] text-[#949ba4] mt-0.5 block">
                Друг присылает эту ссылку из кнопки «Пригласить друзей».
              </span>
            </div>
          )}

          {/* Room Code */}
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#80848e]" />
              Код комнаты
            </label>
            <input
              type="text"
              required
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="krug-main"
              className="w-full bg-[#1e1f22] text-white font-mono border border-[#232428] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#5865f2] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!username.trim() || !roomCode.trim()}
            className="w-full py-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{mode === 'host' ? 'Запустить и войти' : 'Подключиться к другу'}</span>
          </button>
        </form>

        <div className="text-[11px] text-center text-[#949ba4] pt-2 border-t border-[#232428]">
          Полностью бесплатно: WebRTC медиасервер + STUN/TURN ретранслятор.
        </div>
      </div>
    </div>
  );
}
