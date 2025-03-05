const fs = require('fs');
const path = require('path');

// Simplified module resolution helper for Vercel deployments from GitHub
console.log('Setting up path aliases for Vercel deployment...');

try {
  const nodeModulesPath = path.resolve(__dirname, 'node_modules');
  
  // Create a simple module with the proper path
  const moduleIndex = `
// This is an automatically generated file to help with path resolution
module.exports = require('${path.resolve(__dirname, './')}');
`;

  // Create directory if it doesn't exist
  if (!fs.existsSync(path.join(nodeModulesPath, '@'))) {
    fs.mkdirSync(path.join(nodeModulesPath, '@'));
  }

  // Write the index.js file to provide the alias
  fs.writeFileSync(path.join(nodeModulesPath, '@', 'index.js'), moduleIndex);
  
  // Create simple package.json for the module
  const packageJson = {
    name: '@',
    version: '1.0.0',
    main: 'index.js',
    private: true
  };
  
  fs.writeFileSync(
    path.join(nodeModulesPath, '@', 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log('Path alias setup complete!');
} catch (error) {
  console.error('Error setting up path aliases:', error);
  // Don't fail the build if this fails
  process.exit(0);
}