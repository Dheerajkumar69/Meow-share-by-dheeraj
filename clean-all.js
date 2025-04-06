/**
 * This script cleans the project build artifacts and dependencies.
 * Use it to resolve stubborn build issues or start fresh.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Starting deep cleaning process...');

// Directories to clean
const directoriesToClean = [
  '.next',
  'node_modules',
  '.cache'
];

// Clean each directory if it exists
directoriesToClean.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`🗑️  Removing ${dir}...`);
    try {
      // Use a command that works in Windows
      execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'inherit' });
      console.log(`✅ Successfully removed ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${dir}:`, error.message);
    }
  } else {
    console.log(`ℹ️  ${dir} does not exist, skipping`);
  }
});

// Clean package-lock.json if it exists
const packageLockPath = path.join(__dirname, 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
  console.log('🗑️  Removing package-lock.json...');
  try {
    fs.unlinkSync(packageLockPath);
    console.log('✅ Successfully removed package-lock.json');
  } catch (error) {
    console.error('❌ Failed to remove package-lock.json:', error.message);
  }
}

console.log('🔄 Reinstalling dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Successfully reinstalled dependencies');
} catch (error) {
  console.error('❌ Failed to reinstall dependencies:', error.message);
}

console.log('✨ Clean complete! You can now try building the project again.');
console.log('📝 Run: npm run build'); 