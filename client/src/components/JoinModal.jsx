import React, { useState, useEffect, useRef } from 'react';
import { LogIn, User, Hash, Globe, Radio, Upload, Image as ImageIcon, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { connectSocket, getServerUrl } from '../services/socket';

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
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(defaultRoomCode);
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const serverParam = params.get('server');

      if (roomParam) setRoomCode(roomParam);
      if (serverParam) setCustomServerUrl(serverParam);
    }

    const savedName = localStorage.getItem('krug_username');
    if (savedName) setUsername(savedName);

    const savedAvatar = localStorage.getItem('krug_avatar_url');
    if (savedAvatar) setAvatarUrl(savedAvatar);
  }, []);

  if (!isOpen) return null;

  // Handle uploading custom photo and resizing it to 128x128 thumbnail
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 128, 128);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim()) return;

    localStorage.setItem('krug_username', username.trim());
    if (avatarUrl) localStorage.setItem('krug_avatar_url', avatarUrl);

    // If custom server override was entered
    if (customServerUrl.trim()) {
      let target = customServerUrl.trim();
      if (!target.startsWith('http')) {
        target = 'https://' + target;
      }
      connectSocket(target);
    } else {
      connectSocket();
    }

    onJoin({
      username: username.trim(),
      roomCode: roomCode.trim(),
      avatarUrl: avatarUrl || null
    });
  };

  return (
    <div className="fixed inset-0 bg-[#1e1f22]/95 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#313338] rounded-2xl shadow-2xl p-6 border border-[#232428] space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-lg mb-2">
            К
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Добро пожаловать в «Круг»</h1>
          <p className="text-xs text-[#949ba4]">
            Голосовые каналы, видеостримы экрана и чат
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#5865f2]" />
              Ваш никнейм
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите ваш ник (например, Alex)"
              className="w-full bg-[#1e1f22] text-white border border-[#232428] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#5865f2] transition-colors font-medium"
            />
          </div>

          {/* Avatar Selection & Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#5865f2]" />
                Аватарка профиля
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#5865f2] hover:text-[#4752c4] font-medium flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Загрузить фото
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3 bg-[#2b2d31] p-3 rounded-xl border border-[#232428]">
              {/* Current Preview */}
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar preview"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#5865f2] shadow-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                    {(username || 'К').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Preset Avatars */}
              <div className="flex-1">
                <div className="text-[11px] text-[#949ba4] mb-1.5 font-medium">Готовые аватарки:</div>
                <div className="flex items-center gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform ${
                        avatarUrl === url
                          ? 'border-[#23a55a] scale-110 ring-2 ring-[#23a55a]'
                          : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img src={url} alt={`av-${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Room Code */}
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#80848e]" />
              Комната подключения
            </label>
            <input
              type="text"
              required
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="krug-main"
              className="w-full bg-[#1e1f22] text-white font-mono border border-[#232428] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#5865f2] transition-colors"
            />
            <span className="text-[11px] text-[#949ba4] mt-1 block">
              Вы и ваш друг попадете в одну комнату, если укажете одинаковое имя (по умолчанию «krug-main»).
            </span>
          </div>

          {/* Connect Button */}
          <button
            type="submit"
            disabled={!username.trim() || !roomCode.trim()}
            className="w-full py-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:shadow-indigo-500/25 active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Подключиться к голосовому чату</span>
          </button>

          {/* Collapsible Advanced Server Setting */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-[#949ba4] hover:text-white flex items-center gap-1 mx-auto transition-colors"
            >
              <Globe className="w-3 h-3 text-[#23a55a]" />
              <span>Сервер: 24/7 Облако Круг</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 bg-[#1e1f22] rounded-xl border border-[#232428] space-y-1.5 animate-fadeIn">
                <label className="text-[11px] text-[#949ba4] block">
                  Адрес сервера (если хотите подключиться к своему серверу):
                </label>
                <input
                  type="text"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="https://krug-discord.onrender.com"
                  className="w-full bg-[#2b2d31] text-white font-mono text-xs border border-[#35373c] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#5865f2]"
                />
              </div>
            )}
          </div>
        </form>

        <div className="text-[11px] text-center text-[#949ba4] pt-2 border-t border-[#232428] flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse"></span>
          <span>Работает онлайн 24/7 без ограничений</span>
        </div>
      </div>
    </div>
  );
}
