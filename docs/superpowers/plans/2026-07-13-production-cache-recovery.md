# Production Cache Recovery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stale production HTML from referencing removed hashed bundles and stop missing assets from being rewritten to HTML.

**Architecture:** Vercel will cache only fingerprinted `/assets/*` files immutably and will revalidate SPA HTML/navigation responses. The service worker will be retired through both a self-destructing deployed worker and application-side legacy cleanup.

**Tech Stack:** Vite 6, React 18, TypeScript, Vercel routing/headers, Service Worker API

---

## Chunk 1: Routing and cache policy

### Task 1: Make Vercel cache and fallback rules deployment-safe

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Record the current failing configuration evidence**

Run:

```bash
node -e "const c=require('./vercel.json'); if (!c.headers.some(r => r.source === '/(.*)' && r.headers.some(h => h.key === 'Cache-Control' && h.value.includes('immutable')))) process.exit(1); if (!c.rewrites[0].source.includes('pdf')) process.exit(1)"
```

Expected: exit 0, proving the catch-all immutable header and overly broad rewrite are present.

- [ ] **Step 2: Restrict fallback to extensionless application routes**

Change the rewrite source to exclude API routes and requests whose final path segment has an extension:

```json
{
  "source": "/((?!api(?:/|$))(?!.*\\.[^/]+$).*)",
  "destination": "/index.html"
}
```

- [ ] **Step 3: Replace the catch-all immutable header**

Keep only `/assets/(.*)` at `public, max-age=31536000, immutable`. Remove the PDF `Cache-Control` entry because PDF filenames are not fingerprinted, while preserving its Content-Type and CORS headers. Replace the final catch-all cache rule with a navigation rule whose source exactly matches the rewrite source:

```json
{
  "source": "/((?!api(?:/|$))(?!.*\\.[^/]+$).*)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "no-cache, no-store, must-revalidate"
    }
  ]
}
```

Add the same no-cache policy explicitly for `/index.html`. The `/assets/(.*)` rule remains separate because Vercel headers match the incoming source path.

- [ ] **Step 4: Validate JSON and rule separation**

Run:

```bash
node -e "const c=require('./vercel.json'); const nav='/((?!api(?:/|$))(?!.*\\\\.[^/]+$).*)'; const cache=r=>r.headers?.find(h=>h.key==='Cache-Control')?.value; const immutable=c.headers.filter(r=>cache(r)?.includes('immutable')); if (immutable.length!==1 || immutable[0].source!=='/assets/(.*)') process.exit(1); if (cache(c.headers.find(r=>r.source==='/index.html'))!=='no-cache, no-store, must-revalidate') process.exit(1); if (cache(c.headers.find(r=>r.source===nav))!=='no-cache, no-store, must-revalidate') process.exit(1); if (c.rewrites[0].source!==nav) process.exit(1)"
npx vercel build
```

Expected: assertions exit 0; Vercel validates the project configuration and completes the local platform build. If the repository is not linked or production environment values are unavailable, record that limitation and rely on `npm run build` plus preview response validation in Task 4.

## Chunk 2: Service-worker retirement

### Task 2: Replace the old caching worker with a self-cleaning worker

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Remove cache and fetch behavior**

Replace the file with install and activate handlers only. Install passes `self.skipWaiting()` to `event.waitUntil`. Activate passes one promise chain to `event.waitUntil`; that chain deletes every cache whose name starts with `portfolio-`, then calls `self.clients.claim()`, then calls `self.registration.unregister()`. Do not add a `fetch` handler.

- [ ] **Step 2: Verify the worker cannot intercept requests**

Run:

```bash
node --check public/sw.js
if rg -q "addEventListener\\s*\\(\\s*['\"]fetch|portfolio-v2|CACHE_DURATION|PRECACHE_ASSETS" public/sw.js; then exit 1; fi
rg -q "skipWaiting" public/sw.js
rg -q "startsWith\\(['\"]portfolio-" public/sw.js
rg -q "clients\.claim" public/sw.js
rg -q "registration\.unregister" public/sw.js
```

Expected: all commands exit 0; forbidden legacy behavior is absent and every required lifecycle operation is present.

### Task 3: Clean up legacy registrations from the application

**Files:**
- Modify: `serviceWorkerRegistration.ts`
- Modify: `index.tsx`

- [ ] **Step 1: Replace registration helpers with cleanup**

Export `cleanupLegacyServiceWorker()`. In production, run cleanup immediately when `document.readyState === 'complete'`, otherwise attach a one-time `window.load` listener. Feature-check Service Worker and Cache Storage independently. Attempt registration cleanup and cache cleanup independently with `Promise.allSettled` (or separate catches), unregister every registration, and delete every cache name beginning with `portfolio-`. Log rejected cleanup operations without throwing or blocking React.

- [ ] **Step 2: Call cleanup after mounting**

In `index.tsx`, replace the `register` import/call with `cleanupLegacyServiceWorker` and invoke it after `root.render`.

- [ ] **Step 3: Type-check through the production build**

Run:

```bash
npm run build
```

Expected: Vite build succeeds and emits `dist/index.html`, hashed JavaScript, and hashed CSS.

## Chunk 3: End-to-end artifact verification

### Task 4: Verify build consistency and review the patch

**Files:**
- Verify: `dist/index.html`
- Verify: `dist/assets/**`
- Verify: `vercel.json`
- Verify: `public/sw.js`

- [ ] **Step 1: Confirm every generated local asset reference exists**

Run:

```bash
node -e "const fs=require('fs'); const html=fs.readFileSync('dist/index.html','utf8'); const refs=[...html.matchAll(/(?:src|href)=['\"](\/assets\/[^'\"?#]+)(?:[?#][^'\"]*)?['\"]/g)].map(m=>decodeURIComponent(m[1])); const missing=refs.filter(ref=>!fs.existsSync('dist'+ref)); if (!refs.length || missing.length) { console.error({refs,missing}); process.exit(1) } console.log(refs)"
```

Expected: every reference reports present.

- [ ] **Step 2: Review changes for scope**

Run:

```bash
git diff --check
git status --short
git diff -- vercel.json public/sw.js serviceWorkerRegistration.ts index.tsx
```

Expected: no whitespace errors and no unrelated source changes.

- [ ] **Step 3: Document preview verification commands**

After a preview deployment, replace the example URL and run this executable assertion script. It extracts a real asset path from the deployed HTML automatically:

```bash
PREVIEW_URL=https://example-preview.vercel.app node -e "(async()=>{const base=process.env.PREVIEW_URL; if(!base) throw new Error('PREVIEW_URL is required'); const expected='no-cache, no-store, must-revalidate'; const check=async(path,status,type,cache)=>{const r=await fetch(new URL(path,base),{method:'HEAD'}); const actual={status:r.status,type:r.headers.get('content-type')||'',cache:r.headers.get('cache-control')||''}; if(actual.status!==status || !actual.type.includes(type) || (cache && actual.cache!==cache)) throw new Error(path+' '+JSON.stringify(actual));}; await check('/',200,'text/html',expected); await check('/index.html',200,'text/html',expected); await check('/about',200,'text/html',expected); const html=await (await fetch(new URL('/',base))).text(); const asset=html.match(/(?:src|href)=['\"](\/assets\/[^'\"]+\.(?:js|css))['\"]/); if(!asset) throw new Error('No built asset found'); const assetType=asset[1].endsWith('.js')?'javascript':'text/css'; await check(asset[1],200,assetType,'public, max-age=31536000, immutable'); const missing=await fetch(new URL('/assets/js/missing.js',base),{method:'HEAD'}); if(missing.status!==404 || (missing.headers.get('content-type')||'').includes('text/html')) throw new Error('missing asset '+JSON.stringify({status:missing.status,type:missing.headers.get('content-type')})); console.log('preview cache assertions passed')})().catch(e=>{console.error(e);process.exit(1)})"
```

Expected: prints `preview cache assertions passed`. The script fails nonzero for any incorrect status, MIME type, or cache policy, including an HTML response for the missing JavaScript URL.
