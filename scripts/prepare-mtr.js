const fs = require('fs');
const path = require('path');
const { app } = require('electron');

async function prepareMTR() {
    const platform = process.platform;
    
    // Handle both development and production paths
    const resourceDir = app.isPackaged 
        ? path.join(process.resourcesPath, platform)
        : path.join(__dirname, '..', 'resources', platform);
        
    const toolsDir = path.join(app.getPath('userData'), 'tools');
    
    if (!fs.existsSync(toolsDir)) {
        fs.mkdirSync(toolsDir, { recursive: true });
    }

    // Copy appropriate binary based on platform
    if (platform === 'win32') {
        const pspingSource = path.join(resourceDir, 'psping.exe');
        const pspingDest = path.join(toolsDir, 'psping.exe');
        
        if (fs.existsSync(pspingSource)) {
            fs.copyFileSync(pspingSource, pspingDest);
            console.log('PSPing binary copied successfully');
        } else {
            console.error('PSPing binary not found in resources:', pspingSource);
        }
    } else if (platform === 'linux') {
        const mtrSource = path.join(resourceDir, 'mtr');
        const mtrDest = path.join(toolsDir, 'mtr');
        
        if (fs.existsSync(mtrSource)) {
            fs.copyFileSync(mtrSource, mtrDest);
            fs.chmodSync(mtrDest, '755');
            console.log('MTR binary copied successfully');
        } else {
            console.error('MTR binary not found in resources:', mtrSource);
        }
    }
}

module.exports = prepareMTR; 