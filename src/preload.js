const { contextBridge } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Expose path utility to renderer
contextBridge.exposeInMainWorld('electronPath', {
  join: (...args) => path.join(...args),
  dirname: (p) => path.dirname(p)
}); 