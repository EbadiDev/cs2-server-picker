const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const pngToIco = require('png-to-ico');

async function convertIcons() {
    const sourceImage = path.join(__dirname, '../resources/logo/icon.png');
    const sizes = [16, 32, 48, 64, 128, 256];
    
    // Create build/icons directory if it doesn't exist
    const iconDir = path.join(__dirname, '../build/icons');
    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
    }
    
    // Create PNG icons for Linux and Windows
    await sharp(sourceImage)
        .resize(512, 512)
        .png()
        .toFile(path.join(__dirname, '../build/icons/512x512.png'));

    // Create smaller PNGs for Windows ICO
    for (const size of sizes) {
        await sharp(sourceImage)
            .resize(size, size)
            .png()
            .toFile(path.join(__dirname, `../build/icons/${size}x${size}.png`));
    }

    // Create ICO file for Windows using the generated PNGs
    const pngFiles = sizes.map(size => path.join(__dirname, `../build/icons/${size}x${size}.png`));
    const icoBuffer = await pngToIco(pngFiles);
    fs.writeFileSync(path.join(__dirname, '../build/icons/icon.ico'), icoBuffer);

    // Clean up temporary PNG files
    for (const size of sizes) {
        fs.unlinkSync(path.join(__dirname, `../build/icons/${size}x${size}.png`));
    }

    // Create ICNS for macOS
    await sharp(sourceImage)
        .resize(1024, 1024)
        .png()
        .toFile(path.join(__dirname, '../build/icons/icon.icns'));

    console.log('Icons generated successfully');
}

convertIcons().catch(console.error); 