const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function convertIcons() {
    const sourceImage = path.join(__dirname, '../resources/logo/logo.jpg');
    const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
    
    // Create PNG icons for Linux
    await sharp(sourceImage)
        .resize(512, 512)
        .png()
        .toFile(path.join(__dirname, '../build/icons/512x512.png'));

    // Create ICO file for Windows
    const windows = [];
    for (const size of sizes) {
        windows.push(
            sharp(sourceImage)
                .resize(size, size)
                .toBuffer()
        );
    }
    
    const windowsBuffers = await Promise.all(windows);
    await sharp(windowsBuffers[7])  // Use the 1024x1024 version
        .toFile(path.join(__dirname, '../build/icons/icon.ico'));

    // Create ICNS for macOS
    await sharp(sourceImage)
        .resize(1024, 1024)
        .toFile(path.join(__dirname, '../build/icons/icon.icns'));

    console.log('Icons generated successfully');
}

convertIcons().catch(console.error); 