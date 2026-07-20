# Stellar Globe Reveal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wireframe loader with bright stellar ignition and reveal Earth through a safe one-time Globe.gl camera zoom-out.

**Architecture:** A deterministic CSS-only `StellarGlobeLoader` covers lazy and scene initialization. GlobeViz latches Globe.gl readiness, waits for post-bind initialization, enters a noninteractive reveal phase, animates POV from altitude 1.35 to 2.1, then settles ready and removes the overlay.

**Tech Stack:** React 18, TypeScript, CSS, Globe.gl, Vite

---

## Chunk 1: Replace the visual loader

### Task 1: Remove wireframe animation and add stellar ignition

**Files:**
- Delete: `components/GlobeLoadingAnimation.tsx`
- Create: `components/StellarGlobeLoader.tsx`
- Modify: `index.css`
- Modify: `App.tsx`
- Modify: `components/GlobeViz.tsx`

- [ ] Remove every `.globe-loader*` selector and `globe-loader-*` keyframe.
- [ ] Build a decorative `StellarGlobeLoader` with exactly one root plus no more than 16 children (17 DOM elements total), `aria-hidden="true"`, central ignition, two flare axes, deterministic star cluster, dust, status caption, and reveal class. CSS may add at most 7 pseudo-element shapes (24 total shapes maximum).
- [ ] Add `.stellar-loader*` CSS using transform/opacity animation only, static box shadows, no animated filters, no runtime randomness, and no per-star `will-change`.
- [ ] Add reduced-motion CSS that disables twinkle/flash/scale and uses opacity-only exit within 100 ms.
- [ ] Replace imports/usages in App and GlobeViz while preserving the stable HomeSection live status.

## Chunk 2: Implement latched camera reveal

### Task 2: Refactor GlobeViz readiness into loading/revealing/ready

**Files:**
- Create: `utils/globe-reveal-gate.ts`
- Modify: `components/GlobeViz.tsx`

- [ ] Create a small framework-free reveal gate exposing `signalReady()`, `completeInitialization()`, `finishReveal()`, `fail()`, and state inspection. It starts reveal exactly once only after both signal/init; `settled` stays false during reveal; error may win until finish; ready cannot win after error.
- [ ] Expand phase to `loading | revealing | ready | error`; use the attempt-scoped gate rather than immediate settlement.
- [ ] Change Globe.gl callback and no-callback two-rAF fallback to call `signalReady()` only. `signalReady()` latches synchronous bind callbacks and asks the gate to try reveal without marking settled.
- [ ] Immediately after container binding, set hidden camera POV to `{ lat: 16, lng: 106, altitude: 1.35 }`.
- [ ] Before initialization completes, set `controls.enabled = false`. Make hover/wheel/interaction callbacks return while a reveal lock ref is true so they cannot re-enable zoom.
- [ ] After all fatal scene/renderer/controls/listener setup, call `completeInitialization()`; the gate starts reveal only if ready was also signaled.
- [ ] Reveal phase mapping is explicit: canvas opacity is 1 for `revealing` and `ready`; stellar loader gets its flash/exit class during `revealing`; pointer events remain none until `ready`; overlay stays mounted until finish.
- [ ] Reveal start for reduced motion sets final POV 2.1 before canvas opacity changes, suppresses flash/scale, then finishes with opacity-only removal within 100 ms.
- [ ] Normal reveal start sets phase revealing, keeps `controls.enabled = false`, calls `pointOfView(finalPOV, 1600)`, and schedules attempt-managed completion. Finish reasserts final POV duration 0, releases the lock, restores `controls.enabled = true` and hover-controlled zoom behavior, calls gate `finishReveal()`, settles ready once, notifies parent, and removes overlay.
- [ ] Implement one idempotent `teardownAttempt()` used by both markError and effect cleanup: cancel readiness RAFs/reveal timer/all registered timeouts/manual RAF; remove listeners; lock controls; dispose atmosphere; call `_destructor`; clear refs/container; suppress ready/zoom callbacks. Error UI remains visible after teardown.
- [ ] `markError()` may run during revealing because gate settlement remains false. It first fails the gate, sets error UI/status once, then invokes shared teardown without suppressing the parent error callback.
- [ ] No-callback fallback schedules and records both frame IDs, validates only the current connected nonzero canvas, then calls `signalReady`; invalid canvas calls `markError`. Error/unmount cancels both IDs.
- [ ] Ensure ordinary rerenders, language changes, and callback identities do not restart initialization/reveal.

## Chunk 3: Verify and review

### Task 3: Run regression checks

**Files:**
- Verify: `components/StellarGlobeLoader.tsx`
- Verify: `utils/globe-reveal-gate.ts`
- Verify: `components/GlobeViz.tsx`
- Verify: `App.tsx`
- Verify: `index.css`

- [ ] Run `npm run build`; expect success.
- [ ] Run `git diff --check`.
- [ ] Run a deterministic Node test against `utils/globe-reveal-gate.ts` (Node's type stripping) covering signal-before-init, init-before-signal, duplicate signals, error during revealing, finish-before-start rejection, and ready/error exact-once outcomes.
- [ ] Assert old wireframe/orbit selectors are absent; stellar root is decorative; DOM children/pseudo shapes stay within 17/24; no image/video/canvas/runtime randomness exists; and stellar selectors, altitudes `1.35`/`2.1`, duration `1600`, reduced-motion rules, and no animated filter are present.
- [ ] Run local preview artifact/MIME smoke checks.
- [ ] Request independent code review for synchronous ready-during-bind, exact-once reveal, error/unmount cleanup, control locking, final POV, accessibility, and animation performance.
- [ ] In a browser before deploy, repeatedly hard refresh/resize, switch language during load, and check reduced motion. Confirm no oversized/default globe frame, bright stars remain behind hero copy, zoom runs once, and final globe size is stable.
