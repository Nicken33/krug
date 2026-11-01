import { io } from 'socket.io-client';

export const getServerUrl = () => {
  if (typeof window !== 'undefined') {
    // Check URL parameters for explicit server override
    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get('server');
    if (serverParam) {
      localStorage.setItem('krug_server_url', serverParam);
      return serverParam;
    }

    // In web mode on real public host, ALWAYS prefer current origin!
    if (
      window.location.origin &&
      window.location.origin !== 'null' &&
      !window.location.origin.startsWith('file:') &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    ) {
      return window.location.origin;
    }

    // Vite dev server local port 5173
    if (window.location.port === '5173') {
      return `http://${window.location.hostname}:7880`;
    }

    const saved = localStorage.getItem('krug_server_url');
    if (saved && saved.startsWith('http') && !saved.includes('localhost')) {
      return saved;
    }

    if (
      window.location.origin &&
      window.location.origin !== 'null' &&
      !window.location.origin.startsWith('file:') &&
      !window.location.origin.includes('localhost')
    ) {
      return window.location.origin;
    }
  }
  // 24/7 Cloud server default (Frankfurt, Europe for low ping)
  return 'https://krug-eu.onrender.com';
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
