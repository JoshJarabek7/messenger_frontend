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

  // Using Next.js specific path handling with custom resolver plugin
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Add specific path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname),
      '@/lib': path.join(__dirname, 'lib'),
      '@/utils': path.join(__dirname, 'utils'),
      '@/components': path.join(__dirname, 'components'),
      '@/hooks': path.join(__dirname, 'hooks'),
      '@/types': path.join(__dirname, 'types'),
    };
    
    // Add additional modules paths - order is important
    config.resolve.modules = [
      path.join(__dirname),
      'node_modules',
      ...(config.resolve.modules || []),
    ];

    // Add specific file extensions
    config.resolve.extensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.mjs',
      ...(config.resolve.extensions || [])
    ];
    
    // Add our custom resolver plugin
    config.resolve.plugins = [
      ...(config.resolve.plugins || []),
      new ModuleResolverPlugin()
    ];

    // Add debug information when building
    if (isServer) {
      console.log('Webpack alias config:', config.resolve.alias);
      console.log('Webpack modules paths:', config.resolve.modules);
    }
    
    return config;
  },
  
  // Allow more time for building and include buffer for large dependencies
  experimental: {
    timeoutForImportedModule: 60000, // 60 seconds
  },
};

export default withBundleAnalyzer(nextConfig);
