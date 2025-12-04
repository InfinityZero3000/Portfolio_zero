import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Build optimizations
        target: 'es2015',
        minify: 'esbuild',
        // Code splitting configuration
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-animation': ['framer-motion'],
              'vendor-3d': ['three'], // Remove globe.gl as it's loaded from CDN
              'vendor-ui': ['lucide-react', 'clsx']
            },
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
          }
        },
        chunkSizeWarningLimit: 1000,
        sourcemap: false,
        cssCodeSplit: true,
        assetsInlineLimit: 8192, // Increase inline limit for smaller assets
        // Additional optimizations
        reportCompressedSize: false, // Faster builds
        cssMinify: true,
        modulePreload: {
          polyfill: true, // Better browser support
          resolveDependencies: (filename, deps) => {
            // Preload critical chunks first
            return deps.filter(dep => 
              dep.includes('vendor-react') || 
              dep.includes('index')
            );
          }
        }
      },
      // Experimental features for better performance
      experimental: {
        renderBuiltUrl(filename: string) {
          // Use CDN for production assets (optional)
          // return `https://cdn.example.com/${filename}`;
          return `/${filename}`;
        }
      },
      // Performance optimizations
      optimizeDeps: {
        include: [
          'react', 
          'react-dom', 
          'react-router-dom', 
          'framer-motion'
        ],
        exclude: ['globe.gl', 'three-globe']
      },
      ssr: {
        noExternal: ['three-globe', 'globe.gl']
      }
    };
});
