# LayerFlow 3D Renderer

Converts detected UI layers into animated 3D videos using Remotion and Three.js.

## Setup

```bash
cd renderer
npm install
```

## Development

Preview the 3D animation in Remotion Studio:

```bash
npm run dev
```

This opens an interactive preview where you can:
- Scrub through the timeline
- Adjust composition settings
- See the 3D animation in real-time

## Rendering

Render the final MP4 video:

```bash
npm run render
```

Output will be saved to `../output/video.mp4`

## How It Works

1. Reads detection data from `../output/url-detection.json`
2. Loads the screenshot from `../output/url-screenshot.png`
3. Creates 3D planes for each detected layer
4. Positions layers based on z-depth
5. Animates camera with the selected preset
6. Renders to MP4

## Animation Presets

- **orbit-zoom**: Camera orbits around, then zooms in
- **explode-in**: Layers fly in from behind
- **slide-reveal**: Camera slides from side
- **zoom-focus**: Simple zoom-in effect

## Configuration

Edit `src/Root.jsx` to customize:
- Video duration (default: 180 frames = 6 seconds @ 30fps)
- Resolution (default: 1080x1920 - vertical for mobile)
- Animation preset

## Layers

Each layer is rendered as a textured 3D plane:
- Texture is cropped from the full screenshot using UV coordinates
- Z-position determined by detected z-depth (1-10)
- Entrance animation with spring physics
- Subtle floating animation for depth perception
