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
        minify: 'esbuild', // Use esbuild instead of terser
        // Code splitting configuration
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-animation': ['framer-motion'],
              'vendor-3d': ['globe.gl', 'three'],
              'vendor-ui': ['lucide-react', 'clsx']
            },
            // Optimize chunk names
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
          }
        },
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
        // Enable sourcemap for production debugging (optional)
        sourcemap: false,
        // CSS code splitting
        cssCodeSplit: true,
        // Optimize asset handling
        assetsInlineLimit: 4096 // 4kb
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
