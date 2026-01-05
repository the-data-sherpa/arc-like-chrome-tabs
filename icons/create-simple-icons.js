// Simple Node.js script to create placeholder icons
// Run with: node icons/create-simple-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// If canvas is not available, provide instructions
try {
  const canvas = require('canvas');
  
  [16, 48, 128].forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Blue background
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(0, 0, size, size);
    
    // White 'A'
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.6)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', size / 2, size / 2);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icons/icon${size}.png`, buffer);
    console.log(`Created icon${size}.png`);
  });
} catch (e) {
  console.log('Canvas module not available. Please:');
  console.log('1. Install: npm install canvas');
  console.log('2. Or use generate-icons.html in a browser');
  console.log('3. Or create simple PNG files manually');
}
