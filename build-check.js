const { execSync } = require('child_process');

console.log('Running TypeScript check...');

try {
  // Run TypeScript compiler in noEmit mode to just check for errors
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('TypeScript check completed successfully!');
} catch (error) {
  console.error('TypeScript check failed with errors.');
  process.exit(1);
} 