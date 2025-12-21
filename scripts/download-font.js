/**
 * Script to download Vazirmatn Persian font
 * Run: node scripts/download-font.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const fontUrl = 'https://github.com/rastikerdar/vazirmatn/releases/download/v33.003/Vazirmatn-Regular.ttf';
const fontsDir = path.join(__dirname, '../fonts');
const fontPath = path.join(fontsDir, 'Vazirmatn-Regular.ttf');

// Create fonts directory if it doesn't exist
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

console.log('Downloading Vazirmatn font...');
console.log('URL:', fontUrl);
console.log('Destination:', fontPath);

const file = fs.createWriteStream(fontPath);

https.get(fontUrl, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Handle redirect
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✅ Font downloaded successfully!');
        console.log('Font saved to:', fontPath);
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('✅ Font downloaded successfully!');
      console.log('Font saved to:', fontPath);
    });
  }
}).on('error', (err) => {
  fs.unlink(fontPath, () => {}); // Delete the file on error
  console.error('❌ Error downloading font:', err.message);
  console.log('\n📝 Manual download:');
  console.log('1. Visit: https://github.com/rastikerdar/vazirmatn/releases');
  console.log('2. Download Vazirmatn-Regular.ttf');
  console.log('3. Place it in:', fontPath);
});

