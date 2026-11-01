import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, Radio } from 'lucide-react';

export default function TitleBar({ roomCode, ping }) {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      setIsElectron(true);
      window.electronAPI.onMaximizedState?.((max) => setIsMaximized(max));
    }
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <header className="h-8 bg-[#1e1f22] flex items-center justify-between px-3 drag-region select-none border-b border-[#232428] text-xs text-[#949ba4] z-50">
      {/* Left: App logo & Title */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-bold text-[10px]">
          К
        </div>
        <span className="font-semibold text-[#dbdee1] tracking-wide">КРУГ</span>
        {roomCode && (
          <span className="px-1.5 py-0.5 rounded bg-[#2b2d31] text-[11px] text-[#dbdee1]">
            комната: {roomCode}
          </span>
        )}
      </div>

      {/* Middle: Connection & Ping indicator */}
      <div className="flex items-center gap-2 text-[11px]">
        {ping !== null && ping !== undefined && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2b2d31] text-[#949ba4]">
            <Radio className={`w-3 h-3 ${ping < 60 ? 'text-[#23a55a]' : ping < 150 ? 'text-[#f0b232]' : 'text-[#f23f43]'}`} />
            <span>{ping} ms</span>
          </div>
        )}
      </div>

      {/* Right: Window Controls (if Electron) */}
      {isElectron ? (
        <div className="flex items-center no-drag-region h-full">
          <button
            onClick={handleMinimize}
            className="h-full px-3 hover:bg-[#2e3035] hover:text-white flex items-center justify-center transition-colors"
            title="Свернуть"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-3 hover:bg-[#2e3035] hover:text-white flex items-center justify-center transition-colors"
            title={isMaximized ? "Восстановить" : "Развернуть"}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="h-full px-3 hover:bg-[#da373c] hover:text-white flex items-center justify-center transition-colors"
            title="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="text-[11px] text-[#949ba4]">Веб-версия</div>
      )}
    </header>
  );
}
