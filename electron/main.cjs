const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path = require('path');

// Creator credit: Catchy ACCA · by ly77ee
app.name = 'Catchy ACCA';

let mainWindow = null;

// Enforce single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'Catchy ACCA · by ly77ee',
    backgroundColor: '#141419',
    show: false, // Prevents white flash before CSS loads
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Remove default menu in production for clean native desktop look
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Gracefully reveal window only once DOM is rendered to prevent flashes
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Intercept all navigation to external URLs and open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // If navigation targets an external website, open in system browser
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('localhost:5173') && !url.includes('127.0.0.1:5173')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });

  // Load production bundle or Vite dev server
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (isDev && devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load application index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-app-info', () => ({
  name: 'Catchy ACCA',
  version: app.getVersion(),
  platform: process.platform,
  userDataPath: app.getPath('userData'),
}));

ipcMain.handle('open-external', async (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
