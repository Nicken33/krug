/**
 * WebRTC Mesh Network Manager for Voice and Screen Sharing.
 * Handles PeerConnections, ICE candidates, track replacement, and network stats.
 */
export class WebRTCManager {
  constructor({
    socket,
    iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
    onRemoteAudioStream = () => {},
    onRemoteAudioEnded = () => {},
    onRemoteScreenStream = () => {},
    onRemoteScreenEnded = () => {},
    onStatsUpdate = () => {}
  }) {
    this.socket = socket;
    this.iceServers = iceServers;
    this.onRemoteAudioStream = onRemoteAudioStream;
    this.onRemoteAudioEnded = onRemoteAudioEnded;
    this.onRemoteScreenStream = onRemoteScreenStream;
    this.onRemoteScreenEnded = onRemoteScreenEnded;
    this.onStatsUpdate = onStatsUpdate;

    // socketId -> RTCPeerConnection (Voice)
    this.voicePeers = new Map();
    // socketId -> RTCPeerConnection (Screen Share)
    this.screenPeers = new Map();

    // Local streams
    this.localAudioStream = null;
    this.localScreenStream = null;

    this.statsInterval = null;
    this.setupSocketListeners();
  }

  setIceServers(servers) {
    if (Array.isArray(servers) && servers.length) {
      this.iceServers = servers;
    }
  }

  setupSocketListeners() {
    // Incoming WebRTC offer
    this.socket.on('signal-offer', async ({ callerSocketId, offer, isScreenShare }) => {
      try {
        if (isScreenShare) {
          await this.handleScreenOffer(callerSocketId, offer);
        } else {
          await this.handleVoiceOffer(callerSocketId, offer);
        }
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    });

    // Incoming WebRTC answer
    this.socket.on('signal-answer', async ({ responderSocketId, answer, isScreenShare }) => {
      try {
        const pcMap = isScreenShare ? this.screenPeers : this.voicePeers;
        const pc = pcMap.get(responderSocketId);
        if (pc && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    });

    // Incoming ICE candidate
    this.socket.on('signal-ice', async ({ senderSocketId, candidate, isScreenShare }) => {
      try {
        const pcMap = isScreenShare ? this.screenPeers : this.voicePeers;
        const pc = pcMap.get(senderSocketId);
        if (pc && pc.remoteDescription && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('[WebRTC] Error adding ICE candidate:', err);
      }
    });
  }

  // Set local audio stream (microphone)
  setLocalAudioStream(stream) {
    this.localAudioStream = stream;
    // Replace track in all existing voice peer connections
    const audioTrack = stream ? stream.getAudioTracks()[0] : null;

    for (const [peerId, pc] of this.voicePeers.entries()) {
      const senders = pc.getSenders();
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      if (audioSender && audioTrack) {
        audioSender.replaceTrack(audioTrack);
      } else if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }
    }
  }

  // Connect to peers in a voice channel
  connectToVoicePeers(peersList) {
    for (const peer of peersList) {
      if (!this.voicePeers.has(peer.socketId)) {
        this.initiateVoiceCall(peer.socketId);
      }
    }
    this.startStatsMonitor();
  }

  // Create an outgoing voice connection
  async initiateVoiceCall(targetSocketId) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.voicePeers.set(targetSocketId, pc);

    // Add local mic track if present
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, this.localAudioStream);
      });
    }

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal-ice', {
          targetSocketId,
          candidate: event.candidate,
          isScreenShare: false
        });
      }
    };

    // Remote audio track received
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteAudioStream(targetSocketId, event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.closeVoicePeer(targetSocketId);
      }
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      this.socket.emit('signal-offer', {
        targetSocketId,
        offer,
        isScreenShare: false
      });
    } catch (err) {
      console.error('[WebRTC] Failed to create voice offer:', err);
    }
  }

  // Handle incoming voice offer
  async handleVoiceOffer(callerSocketId, offer) {
    let pc = this.voicePeers.get(callerSocketId);
    if (!pc) {
      pc = new RTCPeerConnection({ iceServers: this.iceServers });
      this.voicePeers.set(callerSocketId, pc);

      if (this.localAudioStream) {
        this.localAudioStream.getAudioTracks().forEach(track => {
          pc.addTrack(track, this.localAudioStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('signal-ice', {
            targetSocketId: callerSocketId,
            candidate: event.candidate,
            isScreenShare: false
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onRemoteAudioStream(callerSocketId, event.streams[0]);
        }
      };

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          this.closeVoicePeer(callerSocketId);
        }
      };
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('signal-answer', {
      targetSocketId: callerSocketId,
      answer,
      isScreenShare: false
    });
  }

  // --- SCREEN SHARING ---
  async startScreenShare(screenStream, peersList) {
    this.localScreenStream = screenStream;

    // Handle user stopping screen share from browser banner
    screenStream.getVideoTracks()[0].onended = () => {
      this.stopScreenShare();
    };

    // Broadcast screen share offer to all peers in current voice channel
    for (const peer of peersList) {
      this.initiateScreenCall(peer.socketId, screenStream);
    }
  }

  async initiateScreenCall(targetSocketId, screenStream) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.screenPeers.set(targetSocketId, pc);

    screenStream.getTracks().forEach(track => {
      pc.addTrack(track, screenStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal-ice', {
          targetSocketId,
          candidate: event.candidate,
          isScreenShare: true
        });
      }
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      this.socket.emit('signal-offer', {
        targetSocketId,
        offer,
        isScreenShare: true
      });
    } catch (err) {
      console.error('[WebRTC] Screen offer error:', err);
    }
  }

  async handleScreenOffer(callerSocketId, offer) {
    let pc = this.screenPeers.get(callerSocketId);
    if (!pc) {
      pc = new RTCPeerConnection({ iceServers: this.iceServers });
      this.screenPeers.set(callerSocketId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('signal-ice', {
            targetSocketId: callerSocketId,
            candidate: event.candidate,
            isScreenShare: true
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onRemoteScreenStream(callerSocketId, event.streams[0]);
        }
      };
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('signal-answer', {
      targetSocketId: callerSocketId,
      answer,
      isScreenShare: true
    });
  }

  stopScreenShare() {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(t => t.stop());
      this.localScreenStream = null;
    }

    for (const [peerId, pc] of this.screenPeers.entries()) {
      try {
        pc.close();
      } catch (e) {}
    }
    this.screenPeers.clear();
    this.onRemoteScreenEnded();
  }

  closeVoicePeer(socketId) {
    const pc = this.voicePeers.get(socketId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {}
      this.voicePeers.delete(socketId);
    }
    this.onRemoteAudioEnded(socketId);
  }

  closeScreenPeer(socketId) {
    const pc = this.screenPeers.get(socketId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {}
      this.screenPeers.delete(socketId);
    }
    this.onRemoteScreenEnded(socketId);
  }

  // Periodic statistics check (RTT, jitter, packet loss)
  startStatsMonitor() {
    if (this.statsInterval) return;

    this.statsInterval = setInterval(async () => {
      let totalRtt = 0;
      let count = 0;

      for (const [peerId, pc] of this.voicePeers.entries()) {
        try {
          const stats = await pc.getStats();
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime) {
                totalRtt += report.currentRoundTripTime * 1000;
                count++;
              }
            }
          });
        } catch (e) {}
      }

      if (count > 0) {
        const avgRtt = Math.round(totalRtt / count);
        this.onStatsUpdate({ rtt: avgRtt });
      }
    }, 2000);
  }

  cleanupAll() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.stopScreenShare();

    for (const [peerId, pc] of this.voicePeers.entries()) {
      try {
        pc.close();
      } catch (e) {}
    }
    this.voicePeers.clear();
  }
}
