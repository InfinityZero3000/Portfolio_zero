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
        target: 'esnext', // Use modern JS for smaller, faster bundles
        minify: 'esbuild',
        // Code splitting configuration
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Smart chunking based on module path
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                  return 'vendor-react';
                }
                if (id.includes('framer-motion')) {
                  return 'vendor-animation';
                }
                if (id.includes('three')) {
                  return 'vendor-3d';
                }
                if (id.includes('lucide') || id.includes('clsx')) {
                  return 'vendor-ui';
                }
                // Group smaller dependencies together
                return 'vendor-misc';
              }
            },
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
          },
          treeshake: {
            moduleSideEffects: false, // Better tree-shaking
            propertyReadSideEffects: false
          }
        },
        chunkSizeWarningLimit: 800,
        sourcemap: false,
        cssCodeSplit: true,
        assetsInlineLimit: 4096, // Smaller inline limit for better caching
        // Additional optimizations
        reportCompressedSize: false, // Faster builds
        cssMinify: 'esbuild', // Use esbuild for CSS minification too
        modulePreload: {
          polyfill: false, // Most browsers support this natively now
          resolveDependencies: (filename, deps) => {
            // Only preload the most critical chunks
            return deps.filter(dep => 
              dep.includes('vendor-react') || 
              dep.includes('index')
            ).slice(0, 3); // Limit preloads
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
