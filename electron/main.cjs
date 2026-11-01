const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, session, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { startServer } = require('../server/server.cjs');

// Prevent unexpected crash dialogs from non-critical background network errors
process.on('uncaughtException', (err) => {
  console.warn('[Electron] Uncaught exception handled gracefully:', err.message);
});

// Single Instance Lock (prevents duplicate processes)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Electron] Another instance is already running. Focusing existing window and exiting.');
  app.quit();
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let localServerInstance = null;
const SERVER_PORT = 7880;
const CLOUD_URL = 'https://krug-eu.onrender.com';

function getIconPath() {
  const candidates = [
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, '../icon.ico'),
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(app.getAppPath(), 'icon.ico'),
    path.join(app.getAppPath(), '../icon.ico')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'icon.ico');
}

function ensureServerRunning() {
  return new Promise((resolve) => {
    if (localServerInstance) return resolve(true);

    const req = http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
      console.log('[Electron] Local backend server is already running.');
      resolve(true);
    });

    req.on('error', () => {
      console.log('[Electron] Starting in-process backend server on port', SERVER_PORT);
      try {
        localServerInstance = startServer(SERVER_PORT);
        setTimeout(() => resolve(true), 500);
      } catch (err) {
        console.warn('[Electron] Server start notice:', err.message);
        resolve(false);
      }
    });

    req.setTimeout(600, () => {
      req.destroy();
    });
  });
}

function createTray(iconPath) {
  if (tray) return;
  try {
    tray = new Tray(iconPath);
    tray.setToolTip('Круг — голосовой и текстовый мессенджер');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Открыть «Круг»',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Свернуть в трей',
        click: () => mainWindow?.hide()
      },
      { type: 'separator' },
      {
        label: 'Закрыть приложение',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('[Electron] Tray init warning:', err.message);
  }
}

function createWindow() {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    frame: false, // Discord style frameless
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1f22',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Keep audio & WebRTC active in background while playing games
    }
  });

  createTray(iconPath);

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

  console.log('[Electron] Loading application URL:', targetUrl);
  mainWindow.loadURL(targetUrl);

  // If loading cloud fails (e.g. offline), fallback to local server
  mainWindow.webContents.on('did-fail-load', async (event, errorCode, errorDescription) => {
    console.warn(`[Electron] Remote load notice (${errorCode}: ${errorDescription}), falling back to local server`);
    await ensureServerRunning();
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

// Focus existing window on second launch
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Window Controls from frameless TitleBar
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

// Desktop Capturer (Full screen & window picker with preview)
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
  const isLocalMode = process.argv.includes('--local') || process.env.KRUG_LOCAL === 'true';
  if (isLocalMode) {
    await ensureServerRunning();
  }

  createWindow();

  // Register Global Push-to-Talk Hotkey
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
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
