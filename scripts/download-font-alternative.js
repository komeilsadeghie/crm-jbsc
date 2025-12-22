/**
 * Alternative script to download Vazirmatn font from CDN
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Try alternative CDN sources
const fontUrls = [
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/dist/Vazirmatn-Regular.ttf',
  'https://raw.githubusercontent.com/rastikerdar/vazirmatn/v33.003/dist/Vazirmatn-Regular.ttf',
];

const fontsDir = path.join(__dirname, '../fonts');
const fontPath = path.join(fontsDir, 'Vazirmatn-Regular.ttf');

// Create fonts directory if it doesn't exist
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function downloadFont(url, index = 0) {
  console.log(`Trying source ${index + 1}: ${url}`);
  
  const file = fs.createWriteStream(fontPath);
  
  https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
      // Handle redirect
      return downloadFont(response.headers.location, index);
    }
    
    if (response.statusCode !== 200) {
      file.close();
      fs.unlink(fontPath, () => {});
      if (index < fontUrls.length - 1) {
        console.log(`Failed, trying next source...`);
        return downloadFont(fontUrls[index + 1], index + 1);
      }
      console.error('❌ All sources failed');
      return;
    }
    
    const totalSize = parseInt(response.headers['content-length'] || '0', 10);
    let downloadedSize = 0;
    
    response.on('data', (chunk) => {
      downloadedSize += chunk.length;
      if (totalSize > 0) {
        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
        process.stdout.write(`\rDownloading: ${percent}%`);
      }
    });
    
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log('\n✅ Font downloaded successfully!');
      console.log('Font saved to:', fontPath);
      console.log('File size:', (downloadedSize / 1024).toFixed(2), 'KB');
    });
  }).on('error', (err) => {
    file.close();
    fs.unlink(fontPath, () => {});
    console.error('\n❌ Error:', err.message);
    if (index < fontUrls.length - 1) {
      console.log('Trying next source...');
      downloadFont(fontUrls[index + 1], index + 1);
    } else {
      console.log('\n📝 Manual download:');
      console.log('1. Visit: https://github.com/rastikerdar/vazirmatn/releases');
      console.log('2. Download Vazirmatn-Regular.ttf');
      console.log('3. Place it in:', fontPath);
    }
  });
}

// Delete old font if exists
if (fs.existsSync(fontPath)) {
  fs.unlinkSync(fontPath);
  console.log('Removed old font file');
}

downloadFont(fontUrls[0], 0);

