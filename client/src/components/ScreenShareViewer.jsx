import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX, Monitor } from 'lucide-react';

export default function ScreenShareViewer({
  stream,
  streamerName,
  isLocal = false,
  onStop = null
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(isLocal); // Mute if local to prevent echo
  const [hasAudioTrack, setHasAudioTrack] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      const audioTracks = stream.getAudioTracks();
      setHasAudioTrack(audioTracks.length > 0);

      // Prevent black screen: trigger play explicitly on loadedmetadata
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[ScreenShareViewer] Auto-play was prevented:', err);
        });
      }
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center group shadow-2xl min-h-[300px]"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isAudioMuted}
        className="w-full h-full object-contain select-none"
      />

      {/* Top Overlay Badge */}
      <div className="absolute top-3 left-3 bg-[#111214]/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-white z-10 border border-white/10">
        <Monitor className="w-3.5 h-3.5 text-[#23a55a]" />
        <span className="font-medium">{streamerName}</span>
        {isLocal && <span className="text-[#949ba4]">(Ваш экран)</span>}
        <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
        <span className="text-[11px] text-[#23a55a] font-semibold">В ЭФИРЕ</span>
      </div>

      {/* Control Bar (shown on hover) */}
      <div className="absolute bottom-3 right-3 bg-[#111214]/80 backdrop-blur-md px-2 py-1.5 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-white/10">
        {hasAudioTrack && !isLocal && (
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
            title={isAudioMuted ? "Включить звук стрима" : "Заглушить звук стрима"}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-[#f23f43]" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
          title={isFullscreen ? "Выйти из полноэкранного режима" : "Во весь экран"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {isLocal && onStop && (
          <button
            onClick={onStop}
            className="ml-1 px-2.5 py-1 rounded bg-[#da373c] hover:bg-[#ba272c] text-white text-xs font-medium transition-colors"
          >
            Остановить стрим
          </button>
        )}
      </div>
    </div>
  );
}
