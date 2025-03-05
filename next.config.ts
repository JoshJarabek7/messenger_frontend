import type { NextConfig } from 'next';
import withBundleAnalyzerImport from '@next/bundle-analyzer';
import path from 'path';

// Import our custom resolver plugin
const ModuleResolverPlugin = require('./module-resolver');

const withBundleAnalyzer = withBundleAnalyzerImport({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,

  // Bundle all packages (like the App Router does by default)
  bundlePagesRouterDependencies: true,

  // ESLint configuration
  eslint: {
    // Directories to run ESLint for production builds
    // Exclude components/ui as noted in requirements
    dirs: ['pages', 'app', 'components/!(ui)', 'utils', 'lib', 'hooks'],
    // Warning: Set to true only if you want to override this during build (not recommended)
    ignoreDuringBuilds: false,
  },

  // Environment variables that will be available in the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
    OPENAI_EMBEDDING_DIMENSIONS: process.env.OPENAI_EMBEDDING_DIMENSIONS,
    OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL,
    OPENAI_CHAT_MODEL_REASONING: process.env.OPENAI_CHAT_MODEL_REASONING,
  },

  // Fix for fetch errors in serverless environments
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],

  // Increase timeout for Supabase operations
  serverRuntimeConfig: {
    timeout: 60000, // 60 seconds
  },

  // Using Next.js documented approach for path aliases
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Use process.cwd() instead of __dirname to ensure consistency across environments
    const rootDir = process.cwd();
    
    // Log the root directory for debugging
    console.log('Current working directory:', rootDir);
    console.log('__dirname value:', __dirname);
    
    // Add path aliases using standard patterns
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': rootDir,
    };
    
    // Add additional modules paths - order is important
    config.resolve.modules = [
      rootDir,
      path.join(rootDir, 'node_modules'),
      ...(config.resolve.modules || []),
    ];

    // Add specific file extensions
    config.resolve.extensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.mjs',
      ...(config.resolve.extensions || [])
    ];
    
    // Log webpack configuration for debugging
    if (isServer) {
      console.log('Root directory:', rootDir);
      console.log('Webpack alias config:', JSON.stringify(config.resolve.alias, null, 2));
      console.log('Webpack modules paths:', JSON.stringify(config.resolve.modules, null, 2));
      
      // Check if file exists for debugging
      const fs = require('fs');
      const libUtilsPath = path.join(rootDir, 'lib', 'utils.ts');
      console.log(`Does lib/utils.ts exist? ${fs.existsSync(libUtilsPath)}`);
    }
    
    return config;
  }

};

export default withBundleAnalyzer(nextConfig);
