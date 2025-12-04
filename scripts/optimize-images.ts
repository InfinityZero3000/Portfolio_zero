// Image optimization script
// Converts images to WebP format for better performance
// Install dependencies: npm install -D sharp

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const IMAGE_DIRS = ['public/images', 'src/assets'];
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

async function optimizeImages(dir: string) {
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = join(dir, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        await optimizeImages(filePath);
        continue;
      }
      
      const ext = extname(file).toLowerCase();
      if (VALID_EXTENSIONS.includes(ext)) {
        const outputPath = filePath.replace(ext, '.webp');
        
        await sharp(filePath)
          .webp({ quality: 80 })
          .toFile(outputPath);
        
        console.log(`✓ Optimized: ${file} -> ${file.replace(ext, '.webp')}`);
      }
    }
  } catch (error) {
    console.error(`Error processing ${dir}:`, error);
  }
}

async function main() {
  for (const dir of IMAGE_DIRS) {
    console.log(`\nOptimizing images in ${dir}...`);
    await optimizeImages(dir);
  }
  console.log('\n✓ Image optimization complete!');
}

main();
