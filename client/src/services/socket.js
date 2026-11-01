import { io } from 'socket.io-client';

export const getServerUrl = () => {
  if (typeof window !== 'undefined') {
    // Check URL parameters for explicit server
    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get('server');
    if (serverParam) {
      localStorage.setItem('krug_server_url', serverParam);
      return serverParam;
    }

    const saved = localStorage.getItem('krug_server_url');
    if (saved && saved.startsWith('http')) {
      return saved;
    }

    if (window.location.port === '5173') {
      return `http://${window.location.hostname}:7880`;
    }

    // In web mode, use current host
    if (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) {
      return window.location.origin;
    }
  }
  return 'http://localhost:7880';
};

export let socket = io(getServerUrl(), {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000
});

export const connectSocket = (customUrl = null) => {
  if (customUrl) {
    localStorage.setItem('krug_server_url', customUrl);
    socket.disconnect();
    socket = io(customUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });
    return;
  }

  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
