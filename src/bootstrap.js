// This file is loaded by the renderer script tag
const { ipcRenderer } = require('electron');
const path = require('path');

// Set up global path for module resolution
global.__basedir = path.resolve(__dirname);

// Load the actual renderer code
require('./renderer.js'); 