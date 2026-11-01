import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Volume2, User, Upload, Image, Server, Check } from 'lucide-react';

const PRESET_AVATARS = [
  { id: 'gamer', label: 'Геймер', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gamer1' },
  { id: 'robot', label: 'Робот', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot' },
  { id: 'cat', label: 'Кот', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NekoKitty' },
  { id: 'ninja', label: 'Ниндзя', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowNinja' },
  { id: 'space', label: 'Космос', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AstroMan' },
  { id: 'skull', label: 'Череп', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DarkSkull' }
];

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  audioSettings,
  onUpdateAudioSettings,
  currentMicVolume = 0,
  publicTunnelUrl
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#5865f2');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');

  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const fileInputRef = useRef(null);

  const PRESET_COLORS = [
    '#5865f2', '#23a55a', '#f23f43', '#f0b232', '#eb459e',
    '#57f287', '#fee75c', '#ed4245', '#9b59b6', '#3498db'
  ];

  useEffect(() => {
    if (isOpen) {
      setUsername(currentUser?.username || '');
      setAvatarColor(currentUser?.avatarColor || '#5865f2');
      setAvatarUrl(currentUser?.avatarUrl || '');

      navigator.mediaDevices?.enumerateDevices().then((devices) => {
        setInputDevices(devices.filter(d => d.kind === 'audioinput'));
        setOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
      }).catch(console.error);
    }
  }, [isOpen, currentUser]);

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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onUpdateProfile({
        username: username.trim(),
        avatarColor,
        avatarUrl
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-[#313338] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-[#232428] max-h-[90vh]">
        {/* Left Tabs */}
        <div className="w-full md:w-56 bg-[#2b2d31] p-4 border-r border-[#232428] flex flex-col gap-1.5">
          <div className="px-2 pb-2 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">
            Настройки «Круг»
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'profile'
                ? 'bg-[#35373c] text-white'
                : 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]'
            }`}
          >
            <User className="w-4 h-4 text-[#23a55a]" />
            <span>Профиль и аватар</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'audio'
                ? 'bg-[#35373c] text-white'
                : 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]'
            }`}
          >
            <Mic className="w-4 h-4 text-[#5865f2]" />
            <span>Голос и звук</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'network'
                ? 'bg-[#35373c] text-white'
                : 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1]'
            }`}
          >
            <Server className="w-4 h-4 text-[#f0b232]" />
            <span>Сеть и доступ</span>
          </button>
        </div>

        {/* Right Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#232428]">
              <h2 className="text-base font-bold text-white">
                {activeTab === 'profile' && 'Настройка профиля и аватарки'}
                {activeTab === 'audio' && 'Параметры микрофона и звука'}
                {activeTab === 'network' && 'Сетевой доступ для друзей'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-[#35373c] text-[#949ba4] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-5 text-sm">
                {/* Nickname */}
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1.5">
                    Отображаемое имя
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ваш никнейм"
                    maxLength={32}
                    className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-lg p-2.5 text-sm outline-none focus:border-[#5865f2]"
                  />
                </div>

                {/* Avatar Preview & Upload */}
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-2">
                    Ваша аватарка
                  </label>

                  <div className="flex items-center gap-4">
                    {/* Live Preview Circle */}
                    <div className="relative">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-[#5865f2] shadow-lg"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl shadow-lg"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {(username || 'Я').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Загрузить фото с ПК</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="block text-xs text-[#f23f43] hover:underline"
                        >
                          Удалить фото (использовать цвет)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-2">
                    Или выберите готовую аватарку
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setAvatarUrl(av.url)}
                        className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 ${
                          avatarUrl === av.url ? 'border-[#23a55a] ring-2 ring-[#23a55a]' : 'border-transparent'
                        }`}
                        title={av.label}
                      >
                        <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Choices */}
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-2">
                    Цвет профиля
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setAvatarColor(col)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          avatarColor === col ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white font-semibold text-xs transition-colors shadow-lg"
                  >
                    Применить и сохранить
                  </button>
                </div>
              </form>
            )}

            {/* TAB: AUDIO */}
            {activeTab === 'audio' && (
              <div className="space-y-5 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1.5">
                      Микрофон (ввод)
                    </label>
                    <select
                      value={audioSettings.selectedInputDevice}
                      onChange={(e) => onUpdateAudioSettings({ selectedInputDevice: e.target.value })}
                      className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-lg p-2 text-xs outline-none focus:border-[#5865f2]"
                    >
                      <option value="">По умолчанию</option>
                      {inputDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Микрофон ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1.5">
                      Динамики (вывод)
                    </label>
                    <select
                      value={audioSettings.selectedOutputDevice}
                      onChange={(e) => onUpdateAudioSettings({ selectedOutputDevice: e.target.value })}
                      className="w-full bg-[#1e1f22] text-[#dbdee1] border border-[#232428] rounded-lg p-2 text-xs outline-none focus:border-[#5865f2]"
                    >
                      <option value="">По умолчанию</option>
                      {outputDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Динамики ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Input Mode */}
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-2">
                    Режим микрофона
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onUpdateAudioSettings({ inputMode: 'vad' })}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        audioSettings.inputMode === 'vad'
                          ? 'border-[#23a55a] bg-[#23a55a]/10 text-white'
                          : 'border-[#232428] bg-[#2b2d31] text-[#949ba4]'
                      }`}
                    >
                      <span className="font-semibold text-xs">Активация по голосу</span>
                      <span className="text-[11px] text-[#949ba4]">
                        Включается автоматически при разговоре
                      </span>
                    </button>

                    <button
                      onClick={() => onUpdateAudioSettings({ inputMode: 'ptt' })}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        audioSettings.inputMode === 'ptt'
                          ? 'border-[#5865f2] bg-[#5865f2]/10 text-white'
                          : 'border-[#232428] bg-[#2b2d31] text-[#949ba4]'
                      }`}
                    >
                      <span className="font-semibold text-xs">Режим рации (PTT)</span>
                      <span className="text-[11px] text-[#949ba4]">
                        Говорите только при зажатой клавише
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sensitivity Meter */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-[#b5bac1]">
                    <span>ЧУВСТВИТЕЛЬНОСТЬ МИКРОФОНА</span>
                    <span className="text-[#23a55a]">{currentMicVolume}%</span>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={audioSettings.vadThreshold * 1000}
                    onChange={(e) => onUpdateAudioSettings({ vadThreshold: Number(e.target.value) / 1000 })}
                    className="w-full accent-[#23a55a] bg-[#1e1f22] rounded h-2 mb-2 cursor-pointer"
                  />

                  <div className="h-2.5 bg-[#1e1f22] rounded-full overflow-hidden p-0.5 border border-[#232428]">
                    <div
                      className="h-full bg-[#23a55a] rounded-full transition-all duration-75"
                      style={{ width: `${Math.min(100, currentMicVolume)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NETWORK */}
            {activeTab === 'network' && (
              <div className="space-y-4 text-xs text-[#dbdee1]">
                <div className="p-3 bg-[#1e1f22] rounded-xl border border-[#232428] space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-[#23a55a]" />
                    Статус туннеля для друзей из любой страны:
                  </div>
                  {publicTunnelUrl ? (
                    <div>
                      <div className="text-[#23a55a] font-mono font-bold text-xs select-all bg-[#2b2d31] p-2 rounded break-all">
                        {publicTunnelUrl}
                      </div>
                      <div className="text-[11px] text-[#949ba4] mt-1">
                        Любой человек в мире по этой ссылке сразу попадает на ваш сервер.
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#f0b232]">
                      Туннель запускается автоматически или через файл <code>Поделиться-с-друзьями.bat</code>.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#232428] flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#4e5058]/40 hover:bg-[#4e5058]/60 text-white text-xs font-semibold transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
