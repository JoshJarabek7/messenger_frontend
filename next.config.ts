import type { NextConfig } from 'next';
import withBundleAnalyzerImport from '@next/bundle-analyzer';
import path from 'path';

const withBundleAnalyzer = withBundleAnalyzerImport({
  enabled: process.env.ANALYZE === 'true',
});

// Force using nodeResolve in production (Vercel deployment)
const isProduction = process.env.NODE_ENV === 'production';

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

  // Simplified webpack config based on webpack documentation
  webpack: (config) => {
    // Configure path resolution for aliases
    config.resolve = {
      ...config.resolve,
      // Define the main alias
      alias: {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, './'),
      },
      // Ensure all file extensions are properly handled
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs', '.cjs', '.wasm'],
      // Set modules to include both project root and node_modules
      modules: [path.resolve(__dirname, './'), 'node_modules'],
      // Enable features for better resolution
      symlinks: true,
      preferRelative: false,
      preferAbsolute: true,
    };
    
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
