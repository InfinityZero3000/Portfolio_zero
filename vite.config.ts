import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

// Dev plugin: execute /api/pinned-repos handler directly (mirrors Vercel serverless in dev)
function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url !== '/api/pinned-repos') return next();

        // Load env so GITHUB_TOKEN is available
        const env = loadEnv(server.config.mode ?? 'development', process.cwd(), '');
        const token =
          process.env.GITHUB_TOKEN ??
          env.GITHUB_TOKEN ??
          process.env.VITE_GITHUB_TOKEN ??
          env.VITE_GITHUB_TOKEN;

        if (!token) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'GITHUB_TOKEN not configured',
            hint: 'Add GITHUB_TOKEN=... to .env.local for dev, or set it in Vercel Project Settings → Environment Variables, then redeploy.',
          }));
          return;
        }

        const query = `query {
          user(login: "InfinityZero3000") {
            pinnedItems(first: 6, types: [REPOSITORY]) {
              nodes {
                ... on Repository {
                  name description url stargazerCount forkCount
                  primaryLanguage { name color }
                  homepageUrl updatedAt isPrivate
                }
              }
            }
          }
        }`;

        try {
          const ghRes = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
              'Authorization': `bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });

          if (!ghRes.ok) throw new Error(`GitHub API ${ghRes.status}`);
          const data = await ghRes.json();
          if (data.errors) throw new Error(data.errors[0]?.message ?? 'GraphQL error');

          const repos = data?.data?.user?.pinnedItems?.nodes ?? [];
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(repos));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message ?? 'Failed to fetch pinned repos' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), vercelApiDevPlugin()],
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
