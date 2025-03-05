const fs = require('fs');
const path = require('path');

// This script creates symlinks for path aliases after npm install
// Useful for Vercel deployments from GitHub

console.log('Setting up path aliases for Vercel deployment...');

// Function to recursively create directories
function mkdirRecursive(targetDir) {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  
  targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(parentDir, childDir);
    try {
      if (!fs.existsSync(curDir)) {
        fs.mkdirSync(curDir);
      }
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    return curDir;
  }, initDir);
}

// Create a symlink for lib directory (most commonly imported)
try {
  const libPath = path.resolve(__dirname, 'lib');
  const nodeModulesPath = path.resolve(__dirname, 'node_modules', '@');
  
  // Create @/ directory in node_modules if it doesn't exist
  if (!fs.existsSync(nodeModulesPath)) {
    mkdirRecursive(nodeModulesPath);
  }
  
  // Create symlinks for common directories
  ['lib', 'components', 'hooks', 'utils', 'types'].forEach(dir => {
    const sourcePath = path.resolve(__dirname, dir);
    const linkPath = path.resolve(nodeModulesPath, dir);
    
    if (fs.existsSync(sourcePath) && !fs.existsSync(linkPath)) {
      try {
        // Create relative symlink
        const relativePath = path.relative(path.dirname(linkPath), sourcePath);
        fs.symlinkSync(relativePath, linkPath, 'junction');
        console.log(`Created symlink for ${dir}`);
      } catch (err) {
        console.warn(`Failed to create symlink for ${dir}:`, err.message);
      }
    }
  });
  
  console.log('Path alias setup complete!');
} catch (error) {
  console.error('Error setting up path aliases:', error);
}