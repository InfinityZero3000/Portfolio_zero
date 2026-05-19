# Globe Hard Refresh Design

## Problem

After a cold reload such as `Ctrl+Shift+R`, the home hero can briefly or persistently show an oversized Earth that overwhelms the layout.

## Root Cause

`GlobeViz` initializes the camera at a very close altitude and only later animates outward. Its custom render loop also references an undeclared `camera` variable, which can stop the loop before that animation completes and leave the globe stuck in the close-up frame. The same effect also owns resize handling, so layout changes during startup can recreate the globe and return it to the close-up camera state.

## Chosen Design

1. Initialize the globe directly at its intended resting point of view instead of starting from an extreme close-up.
2. Use the actual globe camera inside the custom render loop so rendering remains stable.
3. Separate one-time globe creation from ongoing resize updates.
4. Keep resize behavior limited to updating renderer dimensions after the globe already exists.

## Expected Result

- Hard refresh loads the hero with the globe already framed correctly.
- Later container size changes do not rebuild the scene or reset the camera.
- Existing globe interaction and theme behavior remain unchanged.
