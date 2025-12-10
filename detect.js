import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  const envPath = join(__dirname, '.env');
  if (!existsSync(envPath)) {
    console.error('❌ .env file not found. Please copy .env.example to .env and add your GEMINI_API_KEY');
    process.exit(1);
  }

  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

loadEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_api_key_here') {
  console.error('❌ Please set your GEMINI_API_KEY in the .env file');
  process.exit(1);
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function detectLayers(imagePath) {
  console.log(`\n🔍 Analyzing screenshot: ${imagePath}`);

  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  // Read image and convert to base64
  const imageData = readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  // Get image dimensions (basic PNG/JPEG parsing)
  const dimensions = getImageDimensions(imageData);
  console.log(`📐 Image dimensions: ${dimensions.width}x${dimensions.height}`);

  const prompt = `Analyze this UI screenshot and identify all distinct UI elements that could be separated into layers for a 3D effect.

IMPORTANT: Be VERY PRECISE with bounding boxes. Each box should tightly fit around the visual boundaries of the element, including:
- All visible parts of buttons (including padding, borders, backgrounds)
- Complete cards with all their content and borders
- Entire text blocks including line height
- Full clickable areas for interactive elements

For each element, return:
- element_type: one of [button, card, nav_bar, hero_image, text_block, input_field, icon, avatar, badge, modal, sidebar, footer, header, logo, illustration, chart, table, list_item, tab, dropdown, toggle, checkbox, radio, slider, progress_bar, tooltip, notification, other]
- label: descriptive name for this element (e.g., "Primary CTA Button", "User Profile Card")
- bounding_box: object with {x, y, width, height} in pixels - MUST tightly wrap the complete visual element including padding and borders
- z_depth: suggested depth from 1-10 where 10 is closest to viewer (foreground elements like buttons = 8-10, mid-ground cards = 4-7, background elements = 1-3)
- is_interactive: boolean, true if this looks like a clickable/interactive element

Return as JSON with this exact structure:
{
  "layers": [
    {
      "element_type": "string",
      "label": "string",
      "bounding_box": {"x": number, "y": number, "width": number, "height": number},
      "z_depth": number,
      "is_interactive": boolean
    }
  ]
}

Guidelines:
- Group related items logically (a card's contents = one layer, not separate text pieces)
- Focus on elements that create visual interest when separated in 3D
- Prioritize larger, distinct elements over tiny details
- ENSURE bounding boxes fully contain each element with no cutoffs`;

  console.log('🤖 Sending to Gemini API...');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    }
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: getMimeType(imagePath),
        data: base64Image
      }
    },
    { text: prompt }
  ]);

  const response = result.response;
  const text = response.text();

  console.log('✅ Received response from Gemini');

  try {
    const parsed = JSON.parse(text);
    return {
      layers: parsed.layers || [],
      dimensions
    };
  } catch (e) {
    console.error('❌ Failed to parse JSON response:', text);
    throw new Error('Invalid JSON response from Gemini');
  }
}

function getImageDimensions(buffer) {
  // Simple PNG dimension parsing
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }

  // Simple JPEG dimension parsing
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;

      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);

      if (marker === 0xC0 || marker === 0xC2) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7)
        };
      }

      offset += size + 2;
    }
  }

  return { width: 1440, height: 900 }; // fallback
}

function getMimeType(imagePath) {
  const ext = imagePath.toLowerCase().split('.').pop();
  const types = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif'
  };
  return types[ext] || 'image/png';
}

function generateVisualization(imagePath, detectionResult) {
  const { layers, dimensions } = detectionResult;

  console.log(`\n📊 Detected ${layers.length} layers:`);
  layers.forEach((layer, i) => {
    console.log(`  ${i + 1}. ${layer.label} (${layer.element_type}) - Z-depth: ${layer.z_depth}`);
  });

  // Generate HTML visualization
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LayerFlow POC - Detection Results</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #fff;
      padding: 40px 20px;
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
    }

    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: #888;
      margin-bottom: 40px;
      font-size: 16px;
    }

    .stats {
      display: flex;
      gap: 30px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }

    .stat {
      background: #1a1a1a;
      padding: 20px 30px;
      border-radius: 12px;
      border: 1px solid #333;
    }

    .stat-label {
      color: #888;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #fff;
    }

    .content {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 30px;
      align-items: start;
    }

    @media (max-width: 1200px) {
      .content {
        grid-template-columns: 1fr;
      }
    }

    .canvas-container {
      background: #1a1a1a;
      border-radius: 12px;
      border: 1px solid #333;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    .canvas-wrapper {
      position: relative;
      display: inline-block;
      max-width: 100%;
    }

    #screenshot {
      display: block;
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }

    #canvas {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    .layers-panel {
      background: #1a1a1a;
      border-radius: 12px;
      border: 1px solid #333;
      padding: 20px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .layers-header {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #333;
    }

    .layer-item {
      background: #0a0a0a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .layer-item:hover {
      border-color: #667eea;
      transform: translateX(5px);
    }

    .layer-item.active {
      border-color: #667eea;
      background: #1a1a2e;
    }

    .layer-label {
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .layer-type {
      display: inline-block;
      background: #667eea;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .layer-depth {
      font-size: 12px;
      color: #888;
      margin-bottom: 5px;
    }

    .depth-bar {
      height: 6px;
      background: #333;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 5px;
    }

    .depth-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s;
    }

    .layer-bbox {
      font-size: 11px;
      color: #666;
      font-family: 'Courier New', monospace;
      margin-top: 8px;
    }

    .interactive-badge {
      display: inline-block;
      background: #10b981;
      color: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 8px;
    }

    .controls {
      margin-bottom: 20px;
      padding: 15px;
      background: #0a0a0a;
      border-radius: 8px;
      border: 1px solid #333;
    }

    .control-label {
      color: #888;
      font-size: 12px;
      margin-bottom: 8px;
      display: block;
    }

    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    /* Scrollbar styling */
    .layers-panel::-webkit-scrollbar {
      width: 8px;
    }

    .layers-panel::-webkit-scrollbar-track {
      background: #0a0a0a;
      border-radius: 4px;
    }

    .layers-panel::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 4px;
    }

    .layers-panel::-webkit-scrollbar-thumb:hover {
      background: #444;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎬 LayerFlow POC</h1>
    <p class="subtitle">AI-Powered UI Layer Detection</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Detected Layers</div>
        <div class="stat-value">${layers.length}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Image Size</div>
        <div class="stat-value">${dimensions.width}×${dimensions.height}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Interactive Elements</div>
        <div class="stat-value">${layers.filter(l => l.is_interactive).length}</div>
      </div>
    </div>

    <div class="content">
      <div class="canvas-container">
        <div class="canvas-wrapper">
          <img id="screenshot" src="../${imagePath}" alt="Screenshot">
          <canvas id="canvas"></canvas>
        </div>
      </div>

      <div class="layers-panel">
        <div class="controls">
          <label class="control-label">Display Options</label>
          <label class="checkbox">
            <input type="checkbox" id="showLabels" checked>
            <span>Show Labels</span>
          </label>
          <label class="checkbox">
            <input type="checkbox" id="showDepth" checked>
            <span>Color by Z-Depth</span>
          </label>
        </div>

        <div class="layers-header">
          Detected Layers (${layers.length})
        </div>
        <div id="layersList"></div>
      </div>
    </div>
  </div>

  <script>
    const layers = ${JSON.stringify(layers)};
    const dimensions = ${JSON.stringify(dimensions)};

    let activeLayerId = null;
    let showLabels = true;
    let showDepth = true;

    // Setup canvas
    const img = document.getElementById('screenshot');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      const rect = img.getBoundingClientRect();
      const scaleX = rect.width / dimensions.width;
      const scaleY = rect.height / dimensions.height;

      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      return { scaleX, scaleY };
    }

    function getDepthColor(depth) {
      if (!showDepth) return 'rgba(102, 126, 234, 0.5)';

      // Gradient from background (cool blue) to foreground (warm purple)
      const colors = [
        [59, 130, 246],   // depth 1-2: blue
        [102, 126, 234],  // depth 3-4: blue-purple
        [139, 92, 246],   // depth 5-6: purple
        [168, 85, 247],   // depth 7-8: purple-pink
        [236, 72, 153],   // depth 9-10: pink
      ];

      const index = Math.min(Math.floor((depth - 1) / 2), colors.length - 1);
      const [r, g, b] = colors[index];
      return \`rgba(\${r}, \${g}, \${b}, 0.5)\`;
    }

    function drawLayers() {
      const { scaleX, scaleY } = resizeCanvas();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      layers.forEach((layer, index) => {
        const isActive = activeLayerId === index;
        const bbox = layer.bounding_box;

        const x = bbox.x * scaleX;
        const y = bbox.y * scaleY;
        const width = bbox.width * scaleX;
        const height = bbox.height * scaleY;

        // Draw bounding box
        ctx.strokeStyle = isActive ? '#667eea' : getDepthColor(layer.z_depth);
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(x, y, width, height);

        // Fill
        ctx.fillStyle = isActive
          ? 'rgba(102, 126, 234, 0.15)'
          : getDepthColor(layer.z_depth).replace('0.5', '0.08');
        ctx.fillRect(x, y, width, height);

        // Draw label
        if (showLabels || isActive) {
          ctx.fillStyle = isActive ? '#667eea' : '#fff';
          ctx.font = \`bold \${Math.max(10, 12 * scaleX)}px sans-serif\`;
          ctx.fillText(layer.label, x + 8, y + 20);

          // Draw depth indicator
          ctx.fillStyle = '#888';
          ctx.font = \`\${Math.max(9, 10 * scaleX)}px sans-serif\`;
          ctx.fillText(\`z: \${layer.z_depth}\`, x + 8, y + 38);
        }
      });
    }

    function renderLayersList() {
      const list = document.getElementById('layersList');
      list.innerHTML = layers.map((layer, index) => \`
        <div class="layer-item \${activeLayerId === index ? 'active' : ''}" onclick="selectLayer(\${index})">
          <div class="layer-label">
            <span class="layer-type">\${layer.element_type}</span>
            \${layer.is_interactive ? '<span class="interactive-badge">Interactive</span>' : ''}
          </div>
          <div>\${layer.label}</div>
          <div class="layer-depth">
            Z-Depth: \${layer.z_depth}/10
            <div class="depth-bar">
              <div class="depth-fill" style="width: \${layer.z_depth * 10}%"></div>
            </div>
          </div>
          <div class="layer-bbox">
            {\${layer.bounding_box.x}, \${layer.bounding_box.y}, \${layer.bounding_box.width}×\${layer.bounding_box.height}}
          </div>
        </div>
      \`).join('');
    }

    function selectLayer(index) {
      activeLayerId = activeLayerId === index ? null : index;
      renderLayersList();
      drawLayers();
    }

    // Event listeners
    img.addEventListener('load', () => {
      drawLayers();
      renderLayersList();
    });

    window.addEventListener('resize', drawLayers);

    document.getElementById('showLabels').addEventListener('change', (e) => {
      showLabels = e.target.checked;
      drawLayers();
    });

    document.getElementById('showDepth').addEventListener('change', (e) => {
      showDepth = e.target.checked;
      drawLayers();
    });

    // Initial render if image already loaded
    if (img.complete) {
      drawLayers();
      renderLayersList();
    }
  </script>
</body>
</html>`;

  const outputPath = join(__dirname, 'output', 'visualization.html');
  writeFileSync(outputPath, html);

  console.log(`\n✨ Visualization generated: ${outputPath}`);
  console.log(`   Open this file in your browser to see the results!`);

  // Also save raw JSON
  const jsonPath = join(__dirname, 'output', 'detection.json');
  writeFileSync(jsonPath, JSON.stringify(detectionResult, null, 2));
  console.log(`📄 Raw JSON saved: ${jsonPath}`);

  return outputPath;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run detect <path-to-screenshot>');
    console.log('\nExample:');
    console.log('  npm run detect screenshot.png');
    process.exit(1);
  }

  const imagePath = args[0];

  try {
    // Create output directory
    const outputDir = join(__dirname, 'output');
    if (!existsSync(outputDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(outputDir);
    }

    const result = await detectLayers(imagePath);
    await generateVisualization(imagePath, result);

    console.log('\n✅ Detection complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
