const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function resizeAllLogos() {
  const inputDir = path.join(__dirname, '../public/club-logos');
  const outputDir = path.join(__dirname, '../public/club-logos-40px');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all PNG files
  const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.png'));
  
  console.log(`🔄 Resizing ${files.length} logos to 40x40px...`);
  
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const file of files) {
    try {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file);
      
      // Skip if already resized
      if (fs.existsSync(outputPath)) {
        skipped++;
        if (skipped % 50 === 0) {
          console.log(`⏭️  Skipped ${skipped} existing files...`);
        }
        continue;
      }
      
      await sharp(inputPath)
        .resize(40, 40, {
          fit: 'contain', // Keeps aspect ratio, adds padding if needed
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent padding
        })
        .png({
          compressionLevel: 9, // Maximum compression
          quality: 90
        })
        .toFile(outputPath);
        
      processed++;
      
      // Show progress every 25 files
      if (processed % 25 === 0) {
        console.log(`✅ Processed ${processed}/${files.length - skipped} logos...`);
      }
      
    } catch (error) {
      failed++;
      console.log(`❌ Failed to resize ${file}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 RESIZE COMPLETE!');
  console.log(`✅ Successfully resized: ${processed}`);
  console.log(`⏭️  Skipped (already done): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Output folder: ${outputDir}`);
  
  // Calculate space saved
  if (processed > 0) {
    const originalSize = fs.statSync(path.join(inputDir, files[0])).size;
    const resizedSize = fs.statSync(path.join(outputDir, files[0])).size;
    const spaceSavedPerFile = originalSize - resizedSize;
    const totalSpaceSaved = (spaceSavedPerFile * processed) / (1024 * 1024);
    
    console.log(`💾 Estimated space saved: ${totalSpaceSaved.toFixed(1)}MB`);
  }
}

resizeAllLogos().catch(console.error);