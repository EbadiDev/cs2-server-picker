const { ipcRenderer } = require('electron');

class WindowControls {
    static init() {
        document.querySelector('.close-btn').addEventListener('click', () => {
            ipcRenderer.invoke('close-window');
        });

        document.querySelector('.minimize-btn').addEventListener('click', () => {
            ipcRenderer.invoke('minimize-window');
        });

        // Make titlebar draggable (no need for window.electron)
        const titlebar = document.querySelector('.titlebar');
        if (titlebar) {
            titlebar.style['-webkit-app-region'] = 'drag';
        }
    }
}

module.exports = WindowControls; 