const fs = require('fs');
const path = require('path');

// Enhanced path alias setup for Vercel deployments
console.log('Setting up enhanced path aliases for Vercel deployment...');

try {
  const rootDir = path.resolve(__dirname);
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  
  // Create @/ directory in node_modules
  const atDirPath = path.join(nodeModulesPath, '@');
  if (!fs.existsSync(atDirPath)) {
    fs.mkdirSync(atDirPath);
  }

  // Define commonly used directories and their paths
  const directories = {
    'lib': path.join(rootDir, 'lib'),
    'components': path.join(rootDir, 'components'),
    'hooks': path.join(rootDir, 'hooks'),
    'utils': path.join(rootDir, 'utils'),
    'types': path.join(rootDir, 'types'),
  };

  // For each directory, create a module that directly resolves to it
  for (const [dirName, dirPath] of Object.entries(directories)) {
    const targetPath = path.join(atDirPath, dirName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    
    // Create index.js that points to the actual directory
    const indexContent = `
// This is an automatically generated file for path alias resolution
module.exports = require('${dirPath}');
`;
    
    fs.writeFileSync(path.join(targetPath, 'index.js'), indexContent);
    
    // Create package.json for the module
    const packageJson = {
      name: `@/${dirName}`,
      version: '1.0.0',
      main: 'index.js',
      private: true
    };
    
    fs.writeFileSync(
      path.join(targetPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // For directories with files that are commonly imported directly, create direct mappings
    if (dirName === 'lib') {
      // Create utils.js file that's commonly imported
      const utilsPath = path.join(dirPath, 'utils');
      if (fs.existsSync(`${utilsPath}.ts`) || fs.existsSync(`${utilsPath}.js`)) {
        fs.writeFileSync(
          path.join(targetPath, 'utils.js'),
          `module.exports = require('${utilsPath}');`
        );
        console.log(`Created direct mapping for @/lib/utils`);
      }
    }
    
    // Create utils mappings for utils directory
    if (dirName === 'utils') {
      // Check for common utils files
      const fileTypes = ['utils', 'index', 'cn', 'type-utils', 'server-utils'];
      fileTypes.forEach(fileType => {
        const filePath = path.join(dirPath, fileType);
        if (fs.existsSync(`${filePath}.ts`) || fs.existsSync(`${filePath}.js`)) {
          fs.writeFileSync(
            path.join(targetPath, `${fileType}.js`),
            `module.exports = require('${filePath}');`
          );
          console.log(`Created direct mapping for @/utils/${fileType}`);
        }
      });
    }
    
    console.log(`Created module mapping for @/${dirName}`);
  }
  
  // Create root index.js
  fs.writeFileSync(
    path.join(atDirPath, 'index.js'),
    `module.exports = require('${rootDir}');`
  );
  
  // Create root package.json
  fs.writeFileSync(
    path.join(atDirPath, 'package.json'),
    JSON.stringify({
      name: '@',
      version: '1.0.0',
      main: 'index.js',
      private: true
    }, null, 2)
  );
  
  console.log('Enhanced path alias setup complete!');
} catch (error) {
  console.error('Error setting up path aliases:', error);
  // Don't fail the build if this fails
  process.exit(0);
}