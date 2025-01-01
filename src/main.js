const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const axios = require('axios');
const { initialize, enable } = require('@electron/remote/main');
const prepareTools = require('../scripts/prepare-tools');

// Initialize remote module
initialize();

// Set up global path
global.__basedir = path.resolve(__dirname);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true,
      additionalArguments: [`--app-path=${app.getAppPath()}`],
      worldSafeExecuteJavaScript: true
    },
    frame: false,
    backgroundColor: '#00000000',
    minWidth: 800,
    minHeight: 600,
    transparent: true,
    roundedCorners: true,
    titleBarStyle: 'hidden',
    vibrancy: 'dark',
    hasShadow: true,
    icon: path.join(__dirname, '../resources/logo/logo.jpg')
  });

  // Enable remote module for this window
  enable(win.webContents);

  // Set CSP in the main process
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; script-src 'self'"]
      }
    });
  });

  win.loadFile(path.join(__dirname, '../public/index.html'));
}

app.whenReady().then(async () => {
    await prepareTools();
    createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Fetch server data from Steam API
ipcMain.handle('fetch-servers', async () => {
  try {
    const response = await axios.get('https://api.steampowered.com/ISteamApps/GetSDRConfig/v1/?appid=730');
    
    if (!response.data || !response.data.pops) {
      return null;
    }
    
    return response.data.pops;
  } catch (error) {
    return null;
  }
});

// Add IPC handlers for window controls
ipcMain.handle('minimize-window', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.handle('close-window', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.handle('window-drag', () => {
  BrowserWindow.getFocusedWindow()?.dragWindow();
});

// Add this IPC handler for privilege checks
ipcMain.handle('check-privileges', async () => {
    const isWindows = process.platform === 'win32';
    try {
        if (isWindows) {
            await execAsync('net session', { shell: 'cmd.exe' });
        } else {
            await execAsync('sudo -n true');
        }
        return true;
    } catch {
        return false;
    }
}); 