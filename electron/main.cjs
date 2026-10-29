const { app, BrowserWindow, shell, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Creator credit: Catchy ACCA · by ly77ee
app.name = 'Catchy ACCA';

let mainWindow = null;
let logFilePath = null;

/**
 * Diagnostic logger writes to userData/logs/catchy-acca-startup.log
 * Crucial for Windows release where GUI binaries run without a console window.
 */
function logStartup(message, error = null) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}${error ? ` | Error: ${error.stack || error}` : ''}\n`;
  try {
    if (!logFilePath) {
      const logsDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      logFilePath = path.join(logsDir, 'catchy-acca-startup.log');
    }
    fs.appendFileSync(logFilePath, line, 'utf8');
  } catch (e) {
    // Suppress filesystem logging failure
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log(line.trim());
  }
}

// Global crash and unhandled exception safety handlers
process.on('uncaughtException', (err) => {
  logStartup('Uncaught exception in main process', err);
  try {
    dialog.showErrorBox(
      'Catchy ACCA - Application Error',
      `An unexpected error occurred during execution:\n\n${err.message || err}\n\nDiagnostic log location:\n${logFilePath || 'logs/catchy-acca-startup.log'}`
    );
  } catch (_) {}
});

process.on('unhandledRejection', (reason) => {
  logStartup('Unhandled rejection in main process', reason);
});

// Enforce single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  logStartup('Duplicate instance attempted. Quitting this instance.');
  app.quit();
} else {
  app.on('second-instance', () => {
    logStartup('Second instance detected; bringing mainWindow to focus.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  logStartup(`Creating BrowserWindow on ${process.platform} (${process.arch}), Electron ${process.versions.electron}`);

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

  let isWindowShown = false;
  const showWindowSafely = (reason) => {
    if (mainWindow && !isWindowShown) {
      isWindowShown = true;
      mainWindow.show();
      logStartup(`Main window shown (${reason}).`);
    }
  };

  // Gracefully reveal window once DOM is rendered to prevent flashes
  mainWindow.once('ready-to-show', () => {
    logStartup('Event: ready-to-show fired.');
    showWindowSafely('ready-to-show');
  });

  // Fallback reveal timer: ensures window opens on Windows even if ready-to-show hangs
  const fallbackTimer = setTimeout(() => {
    if (mainWindow && !isWindowShown) {
      logStartup('Warning: ready-to-show timed out after 2500ms; invoking fallback showWindow.');
      showWindowSafely('fallback-timeout-2500ms');
    }
  }, 2500);

  // WebContents load events
  mainWindow.webContents.on('did-finish-load', () => {
    logStartup('WebContents: did-finish-load completed successfully.');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    const errorMsg = `WebContents load failure (code: ${errorCode}, desc: ${errorDescription}) for URL: ${validatedURL}`;
    logStartup(errorMsg);
    showWindowSafely('did-fail-load');
    try {
      dialog.showErrorBox(
        'Catchy ACCA - Startup Load Error',
        `Failed to load the application window interface.\n\nError ${errorCode}: ${errorDescription}\nTarget URL: ${validatedURL}\n\nDiagnostic log location:\n${logFilePath || 'logs/catchy-acca-startup.log'}`
      );
    } catch (_) {}
  });

  // Intercept all navigation to external URLs and open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      logStartup(`External window open intercepted: ${url}`);
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('localhost:5173') && !url.includes('127.0.0.1:5173')) {
        event.preventDefault();
        logStartup(`External navigation intercepted: ${url}`);
        shell.openExternal(url);
      }
    }
  });

  // Load production bundle or Vite dev server
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (isDev && devServerUrl) {
    logStartup(`Loading dev server URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    logStartup(`Loading production file bundle: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch((err) => {
      logStartup('Failed to load application index.html', err);
      showWindowSafely('loadFile-catch');
      try {
        dialog.showErrorBox(
          'Catchy ACCA - Bundle Load Error',
          `Could not load the application interface from:\n${indexPath}\n\nError: ${err.message}\n\nPlease check the diagnostic log:\n${logFilePath || 'logs/catchy-acca-startup.log'}`
        );
      } catch (_) {}
    });
  }

  mainWindow.on('closed', () => {
    clearTimeout(fallbackTimer);
    mainWindow = null;
    logStartup('Main window closed event.');
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
  logStartup(`Catchy ACCA app.whenReady() triggered. Version: ${app.getVersion()}, Path: ${app.getAppPath()}`);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logStartup('app.on(activate) with 0 windows; creating new window.');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logStartup('app.on(window-all-closed) triggered.');
  if (process.platform !== 'darwin') {
    logStartup('Quitting application for non-macOS platform.');
    app.quit();
  }
});
