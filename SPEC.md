# LayerFlow - UI Screenshot to 3D Video Generator

## Product Overview

LayerFlow is a SaaS application that transforms flat UI screenshots into dynamic 3D "exploded view" videos. Unlike existing mockup tools that simply place screenshots inside device frames, LayerFlow uses AI to detect individual UI elements, separate them into layers, and render them in 3D space with depth and camera animation.

**Core Value Proposition**: Turn any app screenshot into an Apple-keynote-style 3D feature showcase video in under 60 seconds.

---

## Target Users

- App developers creating App Store/Play Store preview videos
- SaaS companies announcing features on social media
- Agencies creating client pitch decks
- Product Hunt launchers needing quick promo content
- Marketing teams without After Effects expertise

---

## Core User Flow

```
1. User uploads screenshot OR pastes URL
2. System captures/processes image
3. AI detects UI elements and suggests layers
4. User can adjust layer selection (optional)
5. User picks animation preset (or customizes)
6. System renders 3D video
7. User downloads MP4 or shares link
```

---

## Technical Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  - Upload/URL input                                                          │
│  - Layer preview & adjustment UI                                             │
│  - Animation preset selector                                                 │
│  - Video preview player                                                      │
│  - Download/share interface                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LARAVEL API BACKEND                               │
│                                                                              │
│  Endpoints:                                                                  │
│  - POST /api/projects (create new project)                                  │
│  - POST /api/projects/{id}/screenshot (upload or URL capture)               │
│  - POST /api/projects/{id}/detect-layers (trigger AI detection)             │
│  - PUT  /api/projects/{id}/layers (save user adjustments)                   │
│  - POST /api/projects/{id}/render (queue video render)                      │
│  - GET  /api/projects/{id}/status (poll render status)                      │
│  - GET  /api/projects/{id}/video (get completed video URL)                  │
│                                                                              │
│  Services:                                                                   │
│  - ScreenshotService (Browsershot for URL capture)                          │
│  - LayerDetectionService (Gemini API integration)                           │
│  - SegmentationService (SAM 2 or Replicate API)                             │
│  - InpaintingService (Stable Diffusion via Replicate)                       │
│  - RenderQueueService (dispatches to render worker)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RENDER WORKER (Node.js)                           │
│                                                                              │
│  - Remotion-based video composition                                          │
│  - Three.js / React Three Fiber for 3D scene                                │
│  - Receives job from Laravel queue (Redis)                                  │
│  - Renders MP4 via Remotion CLI or Lambda                                   │
│  - Uploads to S3, notifies Laravel of completion                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STORAGE (S3/R2)                                 │
│                                                                              │
│  - /screenshots/{project_id}/original.png                                   │
│  - /screenshots/{project_id}/layers/{layer_id}.png                          │
│  - /screenshots/{project_id}/layers/{layer_id}_mask.png                     │
│  - /screenshots/{project_id}/background_inpainted.png                       │
│  - /videos/{project_id}/output.mp4                                          │
│  - /videos/{project_id}/thumbnail.jpg                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend (Laravel)
- **Framework**: Laravel 11
- **Database**: PostgreSQL (or MySQL)
- **Queue**: Redis + Laravel Horizon
- **File Storage**: S3-compatible (AWS S3 or Cloudflare R2)
- **Screenshot Capture**: Browsershot (Puppeteer wrapper)

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **Build**: Vite
- **State**: Zustand or React Query
- **UI Components**: Tailwind CSS + shadcn/ui
- **Canvas Manipulation**: Fabric.js or Konva (for layer adjustment UI)

### Render Worker (Node.js)
- **Video Generation**: Remotion
- **3D Rendering**: React Three Fiber (Three.js)
- **Deployment**: Separate Node.js service or Remotion Lambda

### External APIs
- **UI Detection**: Google Gemini 2.5 Flash (has native bounding box support)
- **Segmentation**: Replicate API (SAM 2) or self-hosted SAM
- **Inpainting**: Replicate API (Stable Diffusion Inpainting)
- **Alternative**: Use Claude Vision for detection if preferred (less accurate bboxes but better reasoning)

---

## Database Schema

### users
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free', -- free, pro, agency
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    renders_this_month INT DEFAULT 0,
    renders_reset_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### projects
```sql
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft', -- draft, detecting, detected, rendering, completed, failed
    source_type VARCHAR(50), -- upload, url
    source_url TEXT,
    original_image_path TEXT,
    background_image_path TEXT, -- inpainted background
    width INT,
    height INT,
    animation_preset VARCHAR(100) DEFAULT 'orbit-zoom',
    animation_config JSONB, -- custom animation settings
    video_path TEXT,
    thumbnail_path TEXT,
    render_started_at TIMESTAMP,
    render_completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### layers
```sql
CREATE TABLE layers (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    element_type VARCHAR(100), -- button, card, nav, hero_image, text_block, input, icon, etc.
    label VARCHAR(255), -- AI-generated or user-edited label
    bbox_x INT,
    bbox_y INT,
    bbox_width INT,
    bbox_height INT,
    z_depth INT DEFAULT 5, -- 1-10, where 10 = closest to camera
    is_highlighted BOOLEAN DEFAULT FALSE, -- if true, camera zooms to this
    is_enabled BOOLEAN DEFAULT TRUE, -- user can disable layers
    layer_image_path TEXT, -- cut out element
    mask_image_path TEXT, -- segmentation mask
    sort_order INT,
    ai_confidence DECIMAL(5,4), -- confidence score from detection
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### render_jobs
```sql
CREATE TABLE render_jobs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    worker_id VARCHAR(255),
    progress INT DEFAULT 0, -- 0-100
    output_format VARCHAR(20) DEFAULT 'mp4',
    output_resolution VARCHAR(20) DEFAULT '1080p', -- 720p, 1080p, 4k
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### animation_presets
```sql
CREATE TABLE animation_presets (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    config JSONB NOT NULL, -- camera path, timing, easing, etc.
    is_pro_only BOOLEAN DEFAULT FALSE,
    sort_order INT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/user
```

### Projects
```
GET    /api/projects                      -- list user's projects
POST   /api/projects                      -- create new project
GET    /api/projects/{id}                 -- get project details
PUT    /api/projects/{id}                 -- update project settings
DELETE /api/projects/{id}                 -- delete project

POST   /api/projects/{id}/screenshot      -- upload file or submit URL
POST   /api/projects/{id}/detect          -- trigger AI layer detection
GET    /api/projects/{id}/layers          -- get detected layers
PUT    /api/projects/{id}/layers          -- bulk update layers (user adjustments)
PUT    /api/projects/{id}/layers/{lid}    -- update single layer

POST   /api/projects/{id}/render          -- queue video render
GET    /api/projects/{id}/render-status   -- poll render progress
GET    /api/projects/{id}/video           -- get video download URL
```

### Presets & Settings
```
GET    /api/presets                       -- list animation presets
GET    /api/presets/{slug}                -- get preset details
GET    /api/user/usage                    -- get renders remaining this month
```

### Webhooks (internal)
```
POST   /api/webhooks/render-complete      -- called by render worker
POST   /api/webhooks/replicate            -- Replicate API callbacks
```

---

## Layer Detection Pipeline

### Step 1: Capture Screenshot (if URL provided)

```php
// ScreenshotService.php
use Spatie\Browsershot\Browsershot;

public function captureFromUrl(string $url, string $outputPath): array
{
    Browsershot::url($url)
        ->windowSize(1440, 900)
        ->waitUntilNetworkIdle()
        ->deviceScaleFactor(2) // retina quality
        ->save($outputPath);
    
    // Return dimensions
    $imageSize = getimagesize($outputPath);
    return [
        'width' => $imageSize[0],
        'height' => $imageSize[1],
        'path' => $outputPath,
    ];
}
```

### Step 2: AI Layer Detection (Gemini)

```php
// LayerDetectionService.php

public function detectLayers(string $imagePath): array
{
    $imageBase64 = base64_encode(file_get_contents($imagePath));
    
    $prompt = <<<PROMPT
Analyze this UI screenshot and identify all distinct UI elements that could be separated into layers for a 3D effect.

For each element, return:
- element_type: one of [button, card, nav_bar, hero_image, text_block, input_field, icon, avatar, badge, modal, sidebar, footer, header, logo, illustration, chart, table, list_item, tab, dropdown, toggle, checkbox, radio, slider, progress_bar, tooltip, notification, other]
- label: descriptive name for this element (e.g., "Primary CTA Button", "User Profile Card")
- bounding_box: [x, y, width, height] in pixels
- z_depth: suggested depth from 1-10 where 10 is closest to viewer (foreground elements like buttons = 8-10, background elements = 1-3)
- is_interactive: boolean, true if this looks like a clickable/interactive element

Return as JSON array. Detect as many distinct elements as possible, but group related items (e.g., a card's contents should be one layer, not 10 separate text layers).

Focus on elements that would create visual interest when separated in 3D space.
PROMPT;

    $response = $this->geminiClient->generateContent([
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt],
                    [
                        'inline_data' => [
                            'mime_type' => 'image/png',
                            'data' => $imageBase64
                        ]
                    ]
                ]
            ]
        ],
        'generationConfig' => [
            'response_mime_type' => 'application/json',
            'temperature' => 0.2,
        ]
    ]);

    return json_decode($response->text(), true);
}
```

### Step 3: Segmentation (SAM 2 via Replicate)

```php
// SegmentationService.php

public function segmentElement(string $imagePath, array $boundingBox): array
{
    $prediction = $this->replicateClient->predictions()->create([
        'version' => 'meta/sam-2:latest',
        'input' => [
            'image' => fopen($imagePath, 'r'),
            'box' => $boundingBox, // [x1, y1, x2, y2]
            'multimask_output' => false,
        ]
    ]);

    // Wait for completion
    $prediction = $this->replicateClient->predictions()->wait($prediction);

    return [
        'mask_url' => $prediction->output['masks'][0],
        'cutout_url' => $prediction->output['cutouts'][0],
    ];
}
```

### Step 4: Background Inpainting

After all elements are segmented, we need to fill the holes:

```php
// InpaintingService.php

public function inpaintBackground(string $imagePath, array $masks): string
{
    // Combine all masks into one
    $combinedMask = $this->combineMasks($masks);
    
    $prediction = $this->replicateClient->predictions()->create([
        'version' => 'stability-ai/stable-diffusion-inpainting:latest',
        'input' => [
            'image' => fopen($imagePath, 'r'),
            'mask' => fopen($combinedMask, 'r'),
            'prompt' => 'clean UI background, seamless, matching style',
            'num_inference_steps' => 25,
        ]
    ]);

    $prediction = $this->replicateClient->predictions()->wait($prediction);
    
    return $prediction->output[0]; // URL to inpainted image
}
```

---

## Render Worker (Remotion)

### Project Structure

```
render-worker/
├── src/
│   ├── compositions/
│   │   ├── ExplodedUI.tsx        # Main composition
│   │   ├── LayerPlane.tsx        # Single layer as 3D plane
│   │   └── CameraRig.tsx         # Camera animation controller
│   ├── presets/
│   │   ├── orbit-zoom.ts
│   │   ├── explode-in.ts
│   │   ├── slide-layers.ts
│   │   ├── focus-highlight.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── spring-configs.ts
│   │   └── easing.ts
│   ├── Root.tsx
│   └── index.ts
├── render.ts                      # CLI entry point for rendering
├── server.ts                      # Express server for job processing
├── remotion.config.ts
└── package.json
```

### Main Composition

```tsx
// src/compositions/ExplodedUI.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { LayerPlane } from './LayerPlane';
import { CameraRig } from './CameraRig';

interface Layer {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zDepth: number;
  isHighlighted: boolean;
}

interface ExplodedUIProps {
  backgroundUrl: string;
  layers: Layer[];
  preset: string;
  canvasWidth: number;
  canvasHeight: number;
}

export const ExplodedUI: React.FC<ExplodedUIProps> = ({
  backgroundUrl,
  layers,
  preset,
  canvasWidth,
  canvasHeight,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate normalized positions (-1 to 1 for Three.js)
  const normalizedLayers = layers.map(layer => ({
    ...layer,
    normalizedX: (layer.x + layer.width / 2) / canvasWidth * 2 - 1,
    normalizedY: -((layer.y + layer.height / 2) / canvasHeight * 2 - 1),
    normalizedWidth: layer.width / canvasWidth * 2,
    normalizedHeight: layer.height / canvasHeight * 2,
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <Canvas>
        <CameraRig preset={preset} frame={frame} fps={fps} duration={durationInFrames} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        
        {/* Background plane */}
        <LayerPlane
          imageUrl={backgroundUrl}
          position={[0, 0, -2]}
          width={2 * (canvasWidth / canvasHeight)}
          height={2}
          frame={frame}
          fps={fps}
          animationDelay={0}
        />
        
        {/* UI Element layers */}
        {normalizedLayers.map((layer, index) => (
          <LayerPlane
            key={layer.id}
            imageUrl={layer.imageUrl}
            position={[
              layer.normalizedX,
              layer.normalizedY,
              layer.zDepth * 0.15 // Scale z-depth to reasonable 3D space
            ]}
            width={layer.normalizedWidth}
            height={layer.normalizedHeight}
            frame={frame}
            fps={fps}
            animationDelay={index * 3} // Stagger animation
            isHighlighted={layer.isHighlighted}
          />
        ))}
      </Canvas>
    </AbsoluteFill>
  );
};
```

### Layer Plane Component

```tsx
// src/compositions/LayerPlane.tsx
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { spring, interpolate } from 'remotion';

interface LayerPlaneProps {
  imageUrl: string;
  position: [number, number, number];
  width: number;
  height: number;
  frame: number;
  fps: number;
  animationDelay: number;
  isHighlighted?: boolean;
}

export const LayerPlane: React.FC<LayerPlaneProps> = ({
  imageUrl,
  position,
  width,
  height,
  frame,
  fps,
  animationDelay,
  isHighlighted = false,
}) => {
  const texture = useTexture(imageUrl);
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate the layer popping into place
  const entrance = spring({
    frame: frame - animationDelay,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
      mass: 0.5,
    },
  });

  // Start from behind and move to final position
  const animatedZ = interpolate(entrance, [0, 1], [position[2] - 1, position[2]]);
  const opacity = interpolate(entrance, [0, 0.3, 1], [0, 1, 1]);
  const scale = interpolate(entrance, [0, 1], [0.8, 1]);

  // Subtle floating animation after entrance
  const floatOffset = Math.sin((frame + animationDelay * 10) * 0.02) * 0.01;

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + floatOffset, animatedZ]}
      scale={[scale, scale, 1]}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
```

### Camera Rig with Presets

```tsx
// src/compositions/CameraRig.tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { interpolate, spring, Easing } from 'remotion';
import { presets } from '../presets';

interface CameraRigProps {
  preset: string;
  frame: number;
  fps: number;
  duration: number;
}

export const CameraRig: React.FC<CameraRigProps> = ({ preset, frame, fps, duration }) => {
  const { camera } = useThree();
  const presetConfig = presets[preset] || presets['orbit-zoom'];
  
  // Calculate camera position based on preset and frame
  const progress = frame / duration;
  
  const { position, lookAt } = presetConfig.getCameraState(progress, frame, fps);
  
  camera.position.set(...position);
  camera.lookAt(new THREE.Vector3(...lookAt));
  
  return null;
};
```

### Animation Presets

```typescript
// src/presets/orbit-zoom.ts
export const orbitZoom = {
  name: 'Orbit & Zoom',
  description: 'Camera orbits around the scene then zooms to highlight',
  getCameraState: (progress: number, frame: number, fps: number) => {
    // Phase 1: Start far back (0-30%)
    // Phase 2: Orbit around (30-70%)
    // Phase 3: Zoom to center (70-100%)
    
    const angle = interpolate(progress, [0, 0.3, 0.7, 1], [0, 0, Math.PI * 0.5, Math.PI * 0.5]);
    const distance = interpolate(progress, [0, 0.3, 0.7, 1], [5, 4, 4, 2.5]);
    const height = interpolate(progress, [0, 0.3, 0.7, 1], [2, 1.5, 1, 0.5]);
    
    return {
      position: [
        Math.sin(angle) * distance,
        height,
        Math.cos(angle) * distance,
      ] as [number, number, number],
      lookAt: [0, 0, 0] as [number, number, number],
    };
  },
};

// src/presets/explode-in.ts
export const explodeIn = {
  name: 'Explode In',
  description: 'Layers fly in from scattered positions',
  getCameraState: (progress: number) => {
    const distance = interpolate(progress, [0, 1], [4, 3]);
    return {
      position: [0, 0.5, distance] as [number, number, number],
      lookAt: [0, 0, 0] as [number, number, number],
    };
  },
};

// src/presets/index.ts
export const presets: Record<string, PresetConfig> = {
  'orbit-zoom': orbitZoom,
  'explode-in': explodeIn,
  'slide-layers': slideLayers,
  'focus-highlight': focusHighlight,
};
```

### Render Server

```typescript
// server.ts
import express from 'express';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Redis from 'ioredis';

const app = express();
const redis = new Redis(process.env.REDIS_URL);
const s3 = new S3Client({ region: process.env.AWS_REGION });

app.use(express.json());

// Process render jobs from queue
async function processJobs() {
  while (true) {
    const job = await redis.brpop('render_queue', 0);
    if (!job) continue;
    
    const jobData = JSON.parse(job[1]);
    
    try {
      await updateJobStatus(jobData.jobId, 'processing');
      
      // Bundle the Remotion project
      const bundled = await bundle({
        entryPoint: './src/index.ts',
        webpackOverride: (config) => config,
      });
      
      // Select composition
      const composition = await selectComposition({
        serveUrl: bundled,
        id: 'ExplodedUI',
        inputProps: jobData.props,
      });
      
      // Render
      const outputPath = `/tmp/${jobData.projectId}.mp4`;
      
      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: jobData.props,
        onProgress: async ({ progress }) => {
          await updateJobProgress(jobData.jobId, Math.round(progress * 100));
        },
      });
      
      // Upload to S3
      const s3Key = `videos/${jobData.projectId}/output.mp4`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: require('fs').createReadStream(outputPath),
        ContentType: 'video/mp4',
      }));
      
      // Notify Laravel
      await fetch(`${process.env.LARAVEL_URL}/api/webhooks/render-complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Worker-Secret': process.env.WORKER_SECRET,
        },
        body: JSON.stringify({
          jobId: jobData.jobId,
          projectId: jobData.projectId,
          videoPath: s3Key,
          status: 'completed',
        }),
      });
      
    } catch (error) {
      console.error('Render failed:', error);
      await updateJobStatus(jobData.jobId, 'failed', error.message);
    }
  }
}

processJobs();
app.listen(3001);
```

---

## Frontend Components

### Key React Components

```
src/
├── components/
│   ├── upload/
│   │   ├── DropZone.tsx              # Drag & drop file upload
│   │   ├── UrlInput.tsx              # URL paste input
│   │   └── UploadProgress.tsx
│   ├── editor/
│   │   ├── LayerCanvas.tsx           # Interactive layer adjustment
│   │   ├── LayerList.tsx             # Sidebar list of detected layers
│   │   ├── LayerItem.tsx             # Individual layer controls
│   │   ├── DepthSlider.tsx           # Z-depth adjustment
│   │   └── PreviewPane.tsx           # Live 3D preview (Three.js)
│   ├── presets/
│   │   ├── PresetGrid.tsx            # Animation preset selector
│   │   └── PresetCard.tsx
│   ├── render/
│   │   ├── RenderButton.tsx
│   │   ├── RenderProgress.tsx
│   │   └── VideoPlayer.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── LoadingSpinner.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── NewProject.tsx
│   ├── Editor.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useProject.ts
│   ├── useLayers.ts
│   ├── useRenderStatus.ts
│   └── useThreePreview.ts
├── api/
│   └── client.ts                     # API client with React Query
└── stores/
    └── editorStore.ts                # Zustand store for editor state
```

### Layer Editor Canvas

```tsx
// components/editor/LayerCanvas.tsx
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useEditorStore } from '@/stores/editorStore';

export const LayerCanvas: React.FC = () => {
  const { 
    screenshot, 
    layers, 
    selectedLayerId, 
    selectLayer, 
    updateLayerBounds 
  } = useEditorStore();

  return (
    <Stage width={screenshot.width} height={screenshot.height}>
      {/* Background image */}
      <Layer>
        <KonvaImage image={screenshot.image} />
      </Layer>
      
      {/* Layer bounding boxes */}
      <Layer>
        {layers.map((layer) => (
          <Rect
            key={layer.id}
            x={layer.bbox_x}
            y={layer.bbox_y}
            width={layer.bbox_width}
            height={layer.bbox_height}
            stroke={selectedLayerId === layer.id ? '#3b82f6' : '#94a3b8'}
            strokeWidth={2}
            fill={`rgba(59, 130, 246, ${layer.is_enabled ? 0.1 : 0.02})`}
            draggable
            onClick={() => selectLayer(layer.id)}
            onDragEnd={(e) => updateLayerBounds(layer.id, {
              bbox_x: e.target.x(),
              bbox_y: e.target.y(),
            })}
          />
        ))}
      </Layer>
    </Stage>
  );
};
```

---

## Environment Variables

### Laravel (.env)
```bash
# App
APP_NAME=LayerFlow
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=layerflow
DB_USERNAME=postgres
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Storage
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=layerflow-assets
AWS_URL=

# External APIs
GEMINI_API_KEY=
REPLICATE_API_TOKEN=

# Render Worker
RENDER_WORKER_URL=http://localhost:3001
RENDER_WORKER_SECRET=

# Stripe
STRIPE_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
```

### Render Worker (.env)
```bash
REDIS_URL=redis://localhost:6379
LARAVEL_URL=http://localhost:8000
WORKER_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=layerflow-assets
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Laravel project setup with authentication (Breeze/Jetstream)
- [ ] Database migrations
- [ ] Basic React frontend with routing
- [ ] File upload to S3
- [ ] Browsershot URL screenshot capture

### Phase 2: AI Detection (Week 3)
- [ ] Gemini API integration for layer detection
- [ ] Layer storage and retrieval
- [ ] Basic layer editor UI (view detected boxes)
- [ ] Manual layer adjustment (resize, delete, add)

### Phase 3: Segmentation Pipeline (Week 4)
- [ ] Replicate API integration (SAM 2)
- [ ] Per-layer segmentation and cutout
- [ ] Background inpainting
- [ ] Asset storage organization

### Phase 4: Render Worker (Week 5-6)
- [ ] Remotion project setup
- [ ] Three.js scene composition
- [ ] 3 animation presets
- [ ] Job queue integration
- [ ] S3 upload of rendered videos

### Phase 5: Polish & Billing (Week 7-8)
- [ ] Live 3D preview in editor
- [ ] Additional animation presets
- [ ] Stripe integration
- [ ] Usage tracking and limits
- [ ] Error handling and retry logic

### Phase 6: Launch Prep (Week 9)
- [ ] Landing page
- [ ] Documentation
- [ ] Monitoring and logging
- [ ] Performance optimization

---

## Pricing Tiers

| Feature | Free | Pro ($29/mo) | Agency ($99/mo) |
|---------|------|--------------|-----------------|
| Videos/month | 3 | 30 | Unlimited |
| Resolution | 720p | 1080p | 4K |
| Watermark | Yes | No | No |
| Animation presets | 3 | All | All + custom |
| Max layers | 10 | 25 | Unlimited |
| API access | No | No | Yes |
| Priority rendering | No | Yes | Yes |
| White-label | No | No | Yes |

---

## Risk Mitigation

### Technical Risks
1. **AI detection accuracy**: May need fallback to manual layer drawing
2. **Inpainting quality**: Consider offering "simple background" option (solid color)
3. **Render time**: Set expectations (1-3 min), use progress indicators
4. **Cost per render**: Monitor API costs, may need to self-host models at scale

### Business Risks
1. **Competition**: Rotato could add this feature - move fast, focus on automation UX
2. **API dependencies**: Replicate/Gemini outages - implement graceful degradation

---

## Success Metrics

- Time from upload to video: < 90 seconds (excluding render)
- AI detection accuracy: > 80% of elements correctly identified
- Render success rate: > 95%
- User activation: > 40% of signups create first video
- Conversion to paid: > 5% of free users

---

## Notes for Claude Code

When implementing, prioritize in this order:
1. Get the basic upload → detect → render flow working end-to-end
2. Don't over-engineer the layer editor initially - basic bounding boxes are fine
3. Use Replicate APIs first, optimize/self-host later
4. Start with 1-2 animation presets, add more after core works
5. The 3D preview in the editor is nice-to-have, not MVP critical

Key files to create first:
1. Database migrations
2. `ScreenshotService.php`
3. `LayerDetectionService.php`  
4. Basic API routes
5. Remotion composition (can test standalone)
