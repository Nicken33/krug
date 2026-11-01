import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, ShieldCheck } from 'lucide-react';

export default function InviteModal({
  isOpen,
  onClose,
  room,
  publicTunnelUrl
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !room) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:7880';
  // If public tunnel is available, use it! It works worldwide.
  const baseUrl = publicTunnelUrl || currentOrigin;
  const inviteUrl = `${baseUrl}/?room=${encodeURIComponent(room.code)}`;

  const copyToClipboard = (text, setFlag) => {
    navigator.clipboard?.writeText(text).then(() => {
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    }).catch(console.error);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-[#313338] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#232428]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#232428] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#5865f2]" />
            <h2 className="text-base font-bold text-white">Пригласить друзей в «{room.name || room.code}»</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#35373c] text-[#949ba4] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          {/* Web Invite Link (Worldwide) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#23a55a]" />
                Прямая ссылка для друзей (любая страна)
              </label>
              {publicTunnelUrl && (
                <span className="text-[10px] text-[#23a55a] font-semibold bg-[#23a55a]/10 px-2 py-0.5 rounded-full">
                  HTTPS онлайн
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 bg-[#1e1f22] text-[#dbdee1] font-mono border border-[#232428] rounded-lg px-3 py-2 text-xs outline-none truncate"
              />
              <button
                onClick={() => copyToClipboard(inviteUrl, setCopiedLink)}
                className="px-3.5 py-2 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
          </div>

          {/* Room Code */}
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase tracking-wide mb-1.5">
              Код комнаты
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={room.code}
                className="flex-1 bg-[#1e1f22] text-white font-mono border border-[#232428] rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={() => copyToClipboard(room.code, setCopiedCode)}
                className="px-3.5 py-2 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Скопировано' : 'Код'}</span>
              </button>
            </div>
          </div>

          {/* How it works info */}
          <div className="p-3.5 rounded-xl bg-[#2b2d31] border border-[#232428] text-xs text-[#949ba4] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-[#23a55a]" />
              Как подключаются друзья:
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Из браузера:</strong> Просто кликают по ссылке с телефона или ПК. Микрофон и экран работают через WebRTC.</li>
              <li><strong>Из Windows-клиента (.exe):</strong> Запускают `Круг.exe`, выбирают «Войти к другу» и вставляют ссылку.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#2b2d31] border-t border-[#232428] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-colors shadow-md"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
