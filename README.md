# 251030_SuperShape

251030_SuperShape is an interactive study of Johan Gielis's superformula. The app renders a deformable supershape mesh in real time, letting you morph between presets, sculpt the surface, tweak mathematical parameters, and inspect the results with a presentation-ready Three.js scene.

## Features
- Parametric supershape generator with live control over the full set of superformula parameters (m1, m2, 
1, 
2, 
3, , ) and mesh resolution.
- Preset browser with smooth morphing, optional auto-cycle playlist, and custom preset tagging when settings are modified.
- Surface sculpting tools that paint latitude/longitude offsets with configurable strength, radius, falloff, and reset.
- Presentation controls covering rotation, wireframe, stats overlay, lighting, and colour gradients for easy storytelling.
- Built with Vite + TypeScript, Three.js, lil-gui, chroma.js, and Rapier (for future physics hooks), providing fast builds and hot reloads.

## Getting Started
1. Install dependencies: 
pm install
2. Launch the dev server: 
pm run dev (opens at http://localhost:5173 by default)
3. Create a production bundle: 
pm run build
4. Preview the production build locally: 
pm run preview

## Controls
- **Superformula:** Sliders for m1, m2, 
1, 
2, 
3, , , and radius adjust the underlying shape; latitude/longitude segment sliders refine the mesh.
- **Presets:** Choose named presets, set morph duration, enable auto cycling, and configure cycle timing.
- **Sculpting:** Toggle sculpt mode to brush deformations onto the surface, adjusting strength, radius, falloff, or resetting to the base mesh.
- **Presentation:** Switch auto-rotation, tune rotation speed, toggle stats and wireframe overlays, and smooth colours with gradient controls.
- **Viewport:** Use OrbitControls (drag to orbit, right-drag to pan, scroll to zoom) to inspect the mesh from any angle.
