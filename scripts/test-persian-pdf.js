/**
 * Test script to verify Persian PDF generation
 * Run: node scripts/test-persian-pdf.js
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Import Persian text helper
const { processText } = require('../dist/utils/persianTextHelper');

// Test font registration
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = path.join(__dirname, '../test-persian.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Try to register font
const fontPath = path.join(__dirname, '../fonts/Vazirmatn-Regular.ttf');
console.log('Looking for font at:', fontPath);
console.log('Font exists:', fs.existsSync(fontPath));

if (fs.existsSync(fontPath)) {
  try {
    doc.registerFont('persian', fontPath);
    console.log('✅ Font registered successfully');
    
    // Test text
    doc.font('persian').fontSize(16);
    const testText = 'این یک متن تست فارسی است';
    const processedText = processText(testText);
    
    console.log('Original text:', testText);
    console.log('Processed text:', processedText);
    
    doc.text(processedText, 50, 100, { align: 'right', width: 500 });
    doc.end();
    
    stream.on('finish', () => {
      console.log('✅ PDF created at:', outputPath);
      console.log('Please open the PDF to verify Persian text rendering');
    });
  } catch (error) {
    console.error('❌ Failed to register font:', error);
    doc.end();
  }
} else {
  console.error('❌ Font not found at:', fontPath);
  doc.end();
}

