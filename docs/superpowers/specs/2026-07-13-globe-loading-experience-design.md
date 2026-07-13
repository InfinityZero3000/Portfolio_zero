# Globe Loading Experience Design

## Problem

The home visualization is lazy-loaded and its Suspense fallback is empty. After the React shell appears, visitors can see an empty hero while the GlobeViz chunk, Globe.gl CDN script, WebGL scene, and textures initialize. GlobeViz also marks itself ready before Globe.gl confirms its first complete render.

## Chosen Design

1. Add a lightweight `GlobeLoadingAnimation` component rendered entirely with HTML and CSS: a rotating wireframe sphere, orbit ring, moving signal point, soft brand glow, and short status text.
2. Use the same loader as the `Suspense` fallback so feedback appears before the GlobeViz JavaScript chunk arrives.
3. Keep the loader as an absolute overlay inside `GlobeViz` while Globe.gl, WebGL, and textures initialize.
4. Track an explicit `loading | ready | error` phase. Register Globe.gl's `onGlobeReady` callback before texture and scene configuration, then mark ready once from that callback. Only when the method is unavailable, use a bounded two-`requestAnimationFrame` fallback that requires a connected, nonzero canvas after initialization. Cancel the fallback on error or unmount.
5. Preserve the hero dimensions and pointer behavior to avoid layout shift or blocked interaction.
6. Respect `prefers-reduced-motion` by disabling rotations and using a simple opacity transition.
7. Wrap the lazy visualization in an Error Boundary so a failed GlobeViz chunk replaces the loader with retry content instead of leaving Suspense stuck or crashing the hero. GlobeViz and the boundary report `ready`/`error` back to HomeSection.

## Accessibility

- Both visual loader instances are decorative and use `aria-hidden="true"`; the overlay is noninteractive with `pointer-events: none`.
- HomeSection owns one stable, visually hidden `role="status"` region outside Suspense. Its text follows the full `loading | ready | error` lifecycle reported by GlobeViz/Error Boundary, so fast chunks cannot skip an announcement and loader replacement cannot duplicate it.
- Text meets the existing theme contrast conventions.
- Under `prefers-reduced-motion: reduce`, continuous motion and scale transitions are disabled; loader removal is immediate or opacity-only within 100 ms.

## Performance Constraints

- No image, video, canvas, WebGL, third-party package, timer loop, or additional network request for the loader.
- Animate only transforms and opacity.
- Keep GlobeViz lazy so the React shell and hero copy paint before the 3D bundle.
- Keep the loader below 16 DOM elements and do not use persistent `will-change`.
- Give both loader placements `absolute; inset: 0` inside the existing `h-screen` hero so they cannot collapse layout or cause CLS.
- Unmount the loader after its 700 ms exit duration; reduced-motion mode removes it immediately.

## Error Handling

- CDN loading retains the existing bounded 8-second timeout. CDN timeout, constructor, WebGL, and synchronous texture configuration failures move the phase to `error` and immediately replace the loader with the existing retry UI.
- A lazy-import failure is handled by the visualization Error Boundary, with a reload retry.
- Ready/error setters and fallback frames are guarded by the mounted flag so callbacks after unmount do nothing.
- Error UI has higher stacking order than the loader; the loader never covers it.

## Verification

- Production build succeeds.
- The loader renders in both Suspense and GlobeViz initialization states.
- Globe readiness is tied to a render-ready signal or guarded canvas fallback.
- Reduced-motion CSS disables continuous loader animation.
- Local preview renders meaningful hero content without a blank loading state or error overlay.
- Static assertions cover callback-ready registration, callback-unavailable fallback, error replacement, unmount guards, pointer pass-through, and reduced-motion rules.
- A deterministic pre-deploy browser/manual check must block the Globe.gl CDN URL and verify that within 8 seconds the loader is replaced by retry UI. Normal-load smoke testing is also required. The repository has no component-test runner, so introducing a test framework is intentionally out of scope for this visual loading change.
