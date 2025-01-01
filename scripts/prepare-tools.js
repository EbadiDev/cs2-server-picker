const fs = require('fs');
const path = require('path');
const { app } = require('electron');

async function prepareTools() {
    const platform = process.platform;
    
    // Only handle Windows PSPing
    if (platform === 'win32') {
        // Handle both development and production paths
        const resourceDir = app.isPackaged 
            ? path.join(process.resourcesPath, platform)
            : path.join(__dirname, '..', 'resources', platform);
            
        const toolsDir = path.join(app.getPath('userData'), 'tools');
        
        if (!fs.existsSync(toolsDir)) {
            fs.mkdirSync(toolsDir, { recursive: true });
        }

        const pspingSource = path.join(resourceDir, 'psping.exe');
        const pspingDest = path.join(toolsDir, 'psping.exe');
        
        if (fs.existsSync(pspingSource)) {
            fs.copyFileSync(pspingSource, pspingDest);
        } else {
            console.error('PSPing binary not found in resources:', pspingSource);
        }
    }
}

module.exports = prepareTools; 