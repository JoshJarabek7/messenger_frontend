const fs = require('fs');
const path = require('path');

// Enhanced path alias setup for Vercel deployments
console.log('Setting up enhanced path aliases for Vercel deployment...');

try {
  const rootDir = process.cwd();
  console.log('PostInstall - Current working directory:', rootDir);
  
  // Create lib directory and utils.ts file directly in the root if it doesn't exist
  const libDir = path.join(rootDir, 'lib');
  if (!fs.existsSync(libDir)) {
    console.log('Creating lib directory in root');
    fs.mkdirSync(libDir, { recursive: true });
  }

  // Check if the original utils.ts exists
  const originalUtilsPath = path.join(rootDir, 'lib', 'utils.ts');
  if (!fs.existsSync(originalUtilsPath)) {
    console.log('Creating utils.ts file in root/lib');
    // Create a basic utils.ts file with the cn function
    const utilsContent = `
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
    fs.writeFileSync(originalUtilsPath, utilsContent);
    console.log('Created lib/utils.ts file directly in the project root');
  } else {
    console.log('lib/utils.ts already exists');
  }

  // List all files in the lib directory
  console.log('Files in lib directory:');
  const libFiles = fs.readdirSync(libDir);
  console.log(libFiles);

  // Enhanced module mapping in node_modules
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
    
    // For lib directory, create utils.js directly
    if (dirName === 'lib') {
      // Create utils.js file that loads directly from the file we just created
      fs.writeFileSync(
        path.join(targetPath, 'utils.js'),
        `
// Direct reference to lib/utils.ts
const { cn } = require('${path.join(rootDir, 'lib', 'utils.ts')}');
module.exports = { cn };
`
      );
      console.log(`Created direct mapping for @/lib/utils`);
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
  console.error(error.stack);
  // Don't fail the build if this fails
  process.exit(0);
}