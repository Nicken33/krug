import React, { useState, useEffect } from 'react';
import { X, Monitor, AppWindow, Play } from 'lucide-react';

export default function ScreenShareModal({
  isOpen,
  onClose,
  onSelectSource
}) {
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [activeTab, setActiveTab] = useState('screens');
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (window.electronAPI && window.electronAPI.getDesktopSources) {
        setIsElectron(true);
        setIsLoading(true);
        window.electronAPI.getDesktopSources().then((srcs) => {
          setSources(srcs || []);
          if (srcs && srcs.length) {
            setSelectedSourceId(srcs[0].id);
          }
          setIsLoading(false);
        }).catch((err) => {
          console.error('[ScreenShareModal] Error getting sources:', err);
          setIsLoading(false);
        });
      } else {
        setIsElectron(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const screens = sources.filter(s => s.id.startsWith('screen:'));
  const windows = sources.filter(s => s.id.startsWith('window:'));

  const handleStartBrowserShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      onSelectSource(stream);
      onClose();
    } catch (err) {
      console.warn('[ScreenShareModal] User cancelled screen share or error:', err);
    }
  };

  const handleStartElectronShare = async () => {
    if (!selectedSourceId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 30,
            maxFrameRate: 60
          }
        }
      });
      onSelectSource(stream);
      onClose();
    } catch (err) {
      console.error('[ScreenShareModal] Electron screen capture error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="bg-[#313338] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-[#232428]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#232428] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-[#23a55a]" />
            <h2 className="text-base font-bold text-white">Демонстрация экрана</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#35373c] text-[#949ba4] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isElectron ? (
            <div>
              {/* Tabs: Screens vs Windows */}
              <div className="flex gap-2 border-b border-[#232428] mb-4">
                <button
                  onClick={() => setActiveTab('screens')}
                  className={`pb-2 px-3 text-xs font-bold uppercase transition-colors flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'screens'
                      ? 'border-[#5865f2] text-white'
                      : 'border-transparent text-[#949ba4] hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Экраны ({screens.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('windows')}
                  className={`pb-2 px-3 text-xs font-bold uppercase transition-colors flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'windows'
                      ? 'border-[#5865f2] text-white'
                      : 'border-transparent text-[#949ba4] hover:text-white'
                  }`}
                >
                  <AppWindow className="w-4 h-4" />
                  <span>Приложения ({windows.length})</span>
                </button>
              </div>

              {/* Grid of Sources */}
              {isLoading ? (
                <div className="py-12 text-center text-[#949ba4] text-sm">
                  Загрузка доступных окон и экранов...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                  {(activeTab === 'screens' ? screens : windows).map((src) => {
                    const isSelected = selectedSourceId === src.id;
                    return (
                      <div
                        key={src.id}
                        onClick={() => setSelectedSourceId(src.id)}
                        className={`p-2 rounded-lg border-2 cursor-pointer transition-all bg-[#2b2d31] flex flex-col gap-2 ${
                          isSelected
                            ? 'border-[#5865f2] shadow-lg scale-[1.02]'
                            : 'border-transparent hover:border-[#35373c]'
                        }`}
                      >
                        <div className="w-full aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
                          {src.thumbnail ? (
                            <img
                              src={src.thumbnail}
                              alt={src.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Monitor className="w-8 h-8 text-[#949ba4]" />
                          )}
                        </div>
                        <span className="text-xs text-[#dbdee1] font-medium truncate px-1">
                          {src.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#23a55a]/10 text-[#23a55a] flex items-center justify-center mx-auto">
                <Monitor className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Трансляция экрана в высоком качестве
                </h3>
                <p className="text-xs text-[#949ba4] max-w-sm mx-auto">
                  Выберите весь экран или отдельное окно браузера / игры. Стрим передается напрямую с поддержкой 60 FPS.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#2b2d31] border-t border-[#232428] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors"
          >
            Отмена
          </button>

          <button
            onClick={isElectron ? handleStartElectronShare : handleStartBrowserShare}
            className="px-5 py-2 rounded bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Прямой эфир</span>
          </button>
        </div>
      </div>
    </div>
  );
}
