const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, session } = require('electron');
const path = require('path');
const http = require('http');
const { startServer } = require('../server/server.cjs');

let mainWindow = null;
const SERVER_PORT = 7880;
const CLOUD_URL = 'https://krug-discord.onrender.com';

function ensureServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
      console.log('[Electron] Backend server is already running.');
      resolve(true);
    });

    req.on('error', () => {
      console.log('[Electron] Starting in-process backend server on port', SERVER_PORT);
      try {
        startServer(SERVER_PORT);
        setTimeout(() => resolve(true), 600);
      } catch (err) {
        console.error('[Electron] Error starting server:', err);
        resolve(false);
      }
    });

    req.setTimeout(500, () => {
      req.destroy();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    frame: false, // Discord style frameless
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1f22',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Keep audio & WebRTC active in background
    }
  });

  // Permission handling for audio & screen capture
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowed = ['media', 'mediaKeySystem', 'notifications', 'display-capture'];
      callback(allowed.includes(permission));
    });

    session.defaultSession.setPermissionCheckHandler(() => true);
  }

  const isLocalMode = process.argv.includes('--local') || process.env.KRUG_LOCAL === 'true';
  const targetUrl = process.env.VITE_DEV_SERVER_URL || process.env.KRUG_SERVER_URL || (isLocalMode ? `http://localhost:${SERVER_PORT}` : CLOUD_URL);

  mainWindow.loadURL(targetUrl);

  // If loading cloud fails (e.g. offline), fallback to local server
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.warn(`[Electron] Remote load failed (${errorCode}: ${errorDescription}), falling back to local server`);
    if (mainWindow && !mainWindow.webContents.getURL().includes('localhost')) {
      mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-state', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-state', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window Controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

// Desktop Capturer (Anti-black screen)
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (err) {
    console.error('[Electron] desktopCapturer error:', err);
    return [];
  }
});

app.whenReady().then(async () => {
  // Ensure background local server is available as fallback
  await ensureServerRunning();
  createWindow();

  try {
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      mainWindow?.webContents.send('global-ptt-change', { pressed: true });
      setTimeout(() => {
        mainWindow?.webContents.send('global-ptt-change', { pressed: false });
      }, 300);
    });
  } catch (e) {
    console.warn('[Electron] Could not register global shortcut:', e);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
