# Globe Hard Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the home hero globe from appearing oversized after hard refreshes.

**Architecture:** Keep globe construction as a one-time lifecycle concern and move subsequent size changes into a dedicated resize effect. Start the camera at the final resting view so first paint and refreshed loads use the same stable framing.

**Tech Stack:** React 18, TypeScript, Globe.gl, Three.js

---

## Chunk 1: Stabilize Globe Initialization

### Task 1: Split initialization from resize behavior

**Files:**
- Modify: `components/GlobeViz.tsx`

- [ ] Move resize-only updates into a dedicated effect that calls `width()` and `height()` on the existing globe.
- [ ] Ensure globe creation runs only when the container first has a measurable size and does not rerun on later width/height changes.
- [ ] Preserve cleanup for listeners, timers, and the globe destructor.

### Task 2: Remove the close-up startup frame

**Files:**
- Modify: `components/GlobeViz.tsx`

- [ ] Initialize `pointOfView` at the existing resting camera view.
- [ ] Use the globe camera in the custom render loop so startup rendering does not fail before the scene settles.
- [ ] Keep readiness state and atmosphere fade-in without relying on the old zoom-out animation.
- [ ] Leave zoom interaction limits and scroll handoff behavior intact.

### Task 3: Verify the fix

**Files:**
- Verify: `components/GlobeViz.tsx`

- [ ] Run `npm run build` and confirm the project still compiles.
- [ ] Load the local app and repeatedly hard refresh the home section to confirm the globe remains correctly framed.
- [ ] Check that ordinary resize still updates the canvas without rebuilding the globe.
