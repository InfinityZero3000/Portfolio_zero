# Globe Loading Experience Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an immediate, rich wireframe-Earth animation until the real Globe.gl scene has rendered, without increasing network or WebGL cost.

**Architecture:** A reusable CSS-only loader covers both the lazy chunk and GlobeViz initialization phases. HomeSection owns stable lifecycle accessibility and a lazy-import Error Boundary, while GlobeViz reports callback-based readiness and initialization errors.

**Tech Stack:** React 18, TypeScript, CSS, Vite, Globe.gl, Three.js

---

## Chunk 1: Lightweight visual feedback

### Task 1: Build the CSS-only globe loader

**Files:**
- Create: `components/GlobeLoadingAnimation.tsx`
- Modify: `index.css`

- [ ] Create a decorative, absolute `pointer-events-none` loader with fewer than 16 elements: glow, wireframe sphere, latitude/longitude grid, orbit, signal, label, and progress dots.
- [ ] Add transform/opacity-only keyframes and a 700 ms `.is-exiting` state.
- [ ] Add light-theme contrast overrides and `prefers-reduced-motion` rules that stop continuous animation and remove scale transitions.
- [ ] Verify the loader contains no canvas, image, video, third-party dependency, or timer loop.

## Chunk 2: Lifecycle and failure handling

### Task 2: Add a lazy-visualization Error Boundary

**Files:**
- Create: `components/VisualizationErrorBoundary.tsx`
- Modify: `App.tsx`
- Modify: `components/SunViz.tsx`

- [ ] Implement a focused class Error Boundary that reports `onError`, renders a heading/message and keyboard-focusable retry button, and reloads the page when requested. Do not add a second live alert; HomeSection owns announcements.
- [ ] In HomeSection, track `loading | ready | error`, render one stable screen-reader status outside Suspense, and reset to `loading` whenever the active theme visualization changes.
- [ ] Memoize ready/error handlers with `useCallback`. Replace `fallback={null}` with `GlobeLoadingAnimation` inside a full-size positioned wrapper.
- [ ] Place `VisualizationErrorBoundary key={theme}` outside the Suspense boundary so it catches lazy-import failures and resets when the active visualization changes.
- [ ] Pass stable `onGlobeReady` and `onGlobeError` callbacks into GlobeViz.
- [ ] Add a stable `onReady` callback prop to SunViz and invoke it after SunViz completes its first successful render, so light theme remains `loading` only while its lazy chunk/WebGL scene is actually pending. The keyed Error Boundary reports Sun errors.

### Task 3: Tie the loader to real Globe.gl readiness

**Files:**
- Modify: `components/GlobeViz.tsx`

- [ ] Extend props with `onGlobeError`; replace the boolean with `loading | ready | error` plus an `isLoaderMounted` exit flag. Store parent callbacks in refs so callback identity never restarts the initialization effect.
- [ ] For each initialization create an attempt token with `mounted` and `settled` guards. Exactly one of ready/error may settle; settling cancels pending readiness frames/timeouts before state or parent callbacks run.
- [ ] Register `myGlobe.onGlobeReady(markReady)` before texture/scene configuration only when `typeof myGlobe.onGlobeReady === 'function'`.
- [ ] Otherwise schedule exactly two guarded animation frames. The final frame accepts only the current renderer canvas when it is connected, contained by the current container, and has a nonzero bounding rectangle; failed validation calls `markError`.
- [ ] Remove the immediate `setIsGlobeReady(true)` call.
- [ ] Treat CDN/constructor/renderer/WebGL and globe/background texture setter failures as fatal. Keep optional atmosphere enhancement failures as warnings.
- [ ] Move the CDN listener and 8-second timeout into managed cleanup. Remove the `globeReady` listener and cancel the CDN timeout, readiness frames, and loader-exit timeout on settle/unmount. Every promise continuation/catch checks the current attempt before acting.
- [ ] On failure, set error phase, remove the loader, and notify HomeSection once.
- [ ] Render the real canvas and loader as siblings. Remove the existing full-screen blur/filter transition; use opacity/transform only and no persistent `will-change`.
- [ ] On ready, query `matchMedia('(prefers-reduced-motion: reduce)')`; unmount immediately for reduced motion, otherwise mark the loader exiting and unmount after 700 ms. Clean up the exit timer on unmount.

## Chunk 3: Verification

### Task 4: Build and smoke-test

**Files:**
- Verify: `components/GlobeLoadingAnimation.tsx`
- Verify: `components/VisualizationErrorBoundary.tsx`
- Verify: `components/GlobeViz.tsx`
- Verify: `App.tsx`
- Verify: `index.css`

- [ ] Run `npm run build`; expect a successful Vite production build.
- [ ] Run static assertions for `onGlobeReady`, attempt settlement guards, managed listener/timer/frame cleanup, guarded canvas fallback, `onGlobeError`, keyed boundary reset, stable callbacks, `aria-live`, pointer pass-through, no canvas blur, and reduced-motion rules.
- [ ] Run `git diff --check` and inspect only intended files.
- [ ] Start local preview and verify meaningful hero content, the loading animation during initialization, no error overlay, and correct entry-bundle MIME.
- [ ] Before production deployment, block the Globe.gl CDN request and verify retry UI replaces the loader within the existing 8-second timeout.
- [ ] Manually verify dark→light during a forced Globe error, light→dark lifecycle status, theme switch during CDN wait, reduced-motion removal, and ordinary HomeSection rerenders without globe reconstruction. Use temporary DevTools blocking/throttling only; do not commit fault injection.
