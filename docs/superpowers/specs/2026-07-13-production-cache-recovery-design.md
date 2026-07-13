# Production Cache Recovery Design

## Problem

Production HTML is cached as immutable for one year. After a deployment, that stale HTML can reference hashed JavaScript files that no longer exist. The SPA rewrite then serves `index.html` for those missing asset requests, so browsers reject the response as `text/html` and the loading screen never clears.

The service worker extends the stale state by caching navigations and `index.html` for three days.

## Design

1. Cache fingerprinted files under `/assets/*` for one year with `immutable`.
2. Serve `/`, `/index.html`, and other SPA navigation responses with `no-cache, no-store, must-revalidate` so each navigation discovers the current asset hashes.
3. Restrict the SPA fallback to extensionless routes. Requests for missing `.js`, `.css`, images, fonts, or other files must remain missing instead of returning HTML.
4. Remove offline caching. Replace the deployed service worker with a self-cleaning worker that uses `skipWaiting`, deletes every `portfolio-*` cache during activation, claims clients, and unregisters itself. It has no fetch handler.
5. Stop registering the worker in application code. On production startup, unregister any legacy registration and delete legacy `portfolio-*` caches as a second cleanup path.

## Failure Handling

- Online navigations always prefer the latest deployment HTML.
- Offline application loading is intentionally unsupported; the browser shows its normal network failure rather than a potentially broken HTML/asset combination.
- Missing build assets return a normal not-found response, making deployment mistakes visible and preserving the correct MIME behavior.
- Already-open tabs may still fail to load a removed lazy chunk after a deployment. Automatic chunk recovery is out of scope for this cache fix; reloading obtains the new HTML and asset graph.

## Verification

- Validate `vercel.json` syntax.
- Run the production Vite build.
- Confirm generated HTML references hashed assets that exist in `dist`.
- Confirm the service worker has no fetch handler and contains explicit legacy cleanup/unregister behavior.
- On a preview deployment, verify `/`, `/index.html`, and an extensionless client route use the HTML no-cache policy; an existing hashed asset is immutable; and a missing `.js` returns a non-HTML 404.
- Keep the asset header rule separate from the navigation rule so the policies cannot overlap; Vercel rewrites are evaluated before serving the fallback destination, while headers match the incoming source path.
- Review the diff for unrelated changes.
