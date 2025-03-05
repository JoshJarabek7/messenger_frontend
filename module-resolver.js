// This module helps resolve path aliases in Next.js for Vercel deployments
const path = require('path');
const fs = require('fs');

// Get the project root directory
const root = process.cwd();

// Function to check if a module exists
function moduleExists(modulePath) {
  try {
    return fs.existsSync(modulePath);
  } catch (e) {
    return false;
  }
}

// Function to resolve path aliases
exports.resolveAlias = function(importPath, basedir) {
  if (importPath.startsWith('@/')) {
    // Convert @/ to absolute path
    const relativePath = importPath.substring(2);
    const absolutePath = path.join(root, relativePath);
    
    // Check if this path exists
    if (moduleExists(absolutePath)) {
      return absolutePath;
    }
    
    // Try with extensions
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    for (const ext of extensions) {
      const pathWithExt = absolutePath + ext;
      if (moduleExists(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    // Try as directory with index file
    const indexPath = path.join(absolutePath, 'index');
    for (const ext of extensions) {
      const indexPathWithExt = indexPath + ext;
      if (moduleExists(indexPathWithExt)) {
        return indexPathWithExt;
      }
    }
  }
  
  // Fall back to default resolution
  return importPath;
};