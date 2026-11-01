/**
 * Voice Activity Detector (VAD) using Web Audio API AnalyserNode.
 * Provides ultra-fast speech detection and audio level metering.
 */
export class AudioVAD {
  constructor({
    stream,
    threshold = 0.03, // RMS threshold (0.01 - 0.2)
    hangoverMs = 250, // Time before switching off speaking state
    onSpeakingChange = () => {},
    onVolumeChange = () => {}
  }) {
    this.stream = stream;
    this.threshold = threshold;
    this.hangoverMs = hangoverMs;
    this.onSpeakingChange = onSpeakingChange;
    this.onVolumeChange = onVolumeChange;

    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.animationFrameId = null;
    this.isSpeaking = false;
    this.lastSpokeTime = 0;
    this.isRunning = false;

    this.init();
  }

  init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !this.stream || !this.stream.getAudioTracks().length) {
        return;
      }

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.3;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.isRunning = true;
      this.processAudio();
    } catch (err) {
      console.error('[AudioVAD] Init error:', err);
    }
  }

  setThreshold(val) {
    this.threshold = Math.max(0.005, Math.min(0.2, val));
  }

  processAudio = () => {
    if (!this.isRunning || !this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    // Calculate RMS (Root Mean Square)
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    const volumePercent = Math.min(100, Math.round(rms * 400));
    this.onVolumeChange(volumePercent);

    const now = Date.now();
    const aboveThreshold = rms > this.threshold;

    if (aboveThreshold) {
      this.lastSpokeTime = now;
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.onSpeakingChange(true);
      }
    } else {
      if (this.isSpeaking && (now - this.lastSpokeTime > this.hangoverMs)) {
        this.isSpeaking = false;
        this.onSpeakingChange(false);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.processAudio);
  };

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChange(false);
    }
    try {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
    } catch (e) {
      // Ignored
    }
  }
}
