# Stellar Globe Reveal Design

## Goal

Replace the current wireframe-Earth loader with a brighter stellar ignition around the future Earth position, then reveal the real globe through a controlled Globe.gl camera zoom-out.

## Visual Sequence

1. While the lazy chunk, CDN, textures, and WebGL scene load, show a CSS-only star field concentrated around the globe area. It contains a bright central star, asymmetric flare rays, several larger twinkling stars, and a sparse dust field.
2. Treat Globe.gl's callback as a `readySignal`, not immediate lifecycle settlement. It may fire synchronously during Kapsule binding. Keep the canvas fully transparent, bind the Kapsule, immediately set `{ lat: 16, lng: 106, altitude: 1.35 }`, and finish all fatal renderer/camera/controls setup before consuming the latched signal.
3. Trigger a short central flash while the star layer fades and expands away.
4. Animate the real Globe.gl camera to the stable resting view `{ lat: 16, lng: 106, altitude: 2.1 }` over 1600 ms.
5. Use `loading | revealing | ready | error` phases. Unmount the stellar overlay and report `ready` only after the camera reveal finishes.

## Constraints

- Delete the current wireframe sphere, latitude/longitude grid, orbit, signal, and related CSS keyframes.
- The stellar loader remains HTML/CSS only: no image, video, extra canvas, library, timer loop, or network request.
- Animate transforms and opacity only. Use box-shadow for static glow, not animated blur/filter.
- Keep the star DOM bounded and deterministic; use CSS custom properties rather than runtime randomness.
- Use at most 18 loader DOM elements and at most 24 star shapes including pseudo-elements. Do not assign per-star `will-change`.
- Preserve the existing CDN timeout, ready/error settlement, Error Boundary, retry UI, and stable accessibility status.
- The camera begins at altitude 1.35, not an extreme close-up, to avoid the previous hard-refresh oversized-globe defect.
- Camera reveal runs exactly once per GlobeViz initialization and does not restart on HomeSection rerenders or language changes.
- Each initialization owns a reveal-started guard and cleanup-managed completion timer. A synchronous callback only latches the signal; it cannot settle before initialization completes, so later fatal setup failures still win as errors.
- Disable globe pointer interaction and OrbitControls during the 1600 ms reveal. At completion, set the final POV to altitude 2.1 again, restore controls/pointer behavior, settle ready once, and remove the overlay. Error/unmount cancels all reveal work.

## Reduced Motion

Under `prefers-reduced-motion: reduce`, disable twinkle, flare, flash, expansion, and every scale transition. Set the camera to altitude 2.1 before revealing the canvas, use opacity only for at most 100 ms, then settle ready and remove the overlay without a 1600 ms tween.

## Verification

- Production build succeeds and `git diff --check` is clean.
- Static checks confirm old wireframe/orbit selectors are gone, the star loader is CSS-only, and both camera altitudes/duration are present.
- Code review verifies camera animation runs once, cannot fire after unmount/error, and retains the final resting camera.
- Static lifecycle checks cover a ready signal fired synchronously during bind, error/unmount during reveal, callback/rerender non-restart, and reduced-motion bypass.
- Local preview artifact and MIME smoke checks pass.
- Visual browser acceptance repeats hard refresh and resize, confirms no oversized/default frame leaks, verifies final POV after 1600 ms, and confirms language/rerender changes do not restart the zoom. It also confirms bright stars appear before Earth and the flash does not obscure hero copy.
