const fs = require('fs');
const path = require('path');

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy kuromoji dictionary files to public directory
const srcDir = path.join(__dirname, '..', 'node_modules', 'kuromoji', 'dict');
const destDir = path.join(__dirname, '..', 'public', 'node_modules', 'kuromoji', 'dict');

console.log('Copying kuromoji dictionary files...');
console.log('From:', srcDir);
console.log('To:', destDir);

try {
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, destDir);
    console.log('✅ Successfully copied kuromoji dictionary files');
  } else {
    console.log('⚠️ Source directory not found:', srcDir);
    console.log('Kuromoji dictionary files may not be available');
  }
} catch (error) {
  console.error('❌ Error copying kuromoji dictionary files:', error);
  // Don't fail the build, just log the error
  process.exit(0);
} 