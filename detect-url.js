import puppeteer from 'puppeteer';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnv() {
  const envPath = join(__dirname, '.env');
  if (existsSync(envPath)) {
    const envFile = readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

const SELECTORS = {
  // Common interactive elements
  buttons: 'button, [role="button"], .btn, .button, input[type="submit"], input[type="button"]',
  links: 'a[href]',
  inputs: 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select',
  images: 'img[src]',

  // Layout elements
  nav: 'nav, [role="navigation"], header nav',
  header: 'header, [role="banner"]',
  footer: 'footer, [role="contentinfo"]',
  main: 'main, [role="main"]',

  // Content blocks
  cards: '.card, [class*="card"], article',
  sections: 'section',

  // Skip these (too generic or invisible)
  skip: 'script, style, noscript, meta, link, [hidden], [style*="display: none"], [style*="visibility: hidden"]'
};

// Helper function to dismiss common popups
async function dismissCommonPopups(page) {
  const popupSelectors = [
    // Cookie banners - "Accept" buttons
    'button:has-text("Accept All Cookies")',
    'button:has-text("Accept All")',
    'button:has-text("Accept")',
    '[id*="accept"][id*="cookie"]',
    '[class*="accept"][class*="cookie"]',

    // Cookie banners - "Close" buttons
    'button[aria-label*="Close"]',
    'button[aria-label*="close"]',
    '[class*="close"]',
    '[id*="close"]',

    // Modal close buttons
    'button.modal-close',
    '[data-dismiss="modal"]',
    '.modal [aria-label="Close"]',

    // Age verification
    'button:has-text("I am 18")',
    'button:has-text("Enter")',

    // Newsletter popups
    'button:has-text("No thanks")',
    '[aria-label="Close popup"]',

    // Generic overlay close
    '.overlay button',
    '[role="dialog"] button[aria-label*="close" i]'
  ];

  for (const selector of popupSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          console.log(`   Clicking: ${selector}`);
          await element.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (e) {
      // Selector not found or click failed, continue
    }
  }

  // Try to press Escape key to close modals
  try {
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (e) {
    // Ignore
  }
}

// Helper function to auto-scroll the page
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0); // Scroll back to top
          resolve();
        }
      }, 100);
    });
  });
}

async function detectLayersFromUrl(url, options = {}) {
  const {
    device = 'desktop',  // 'desktop' or 'mobile'
    dismissPopups = true,
    scroll = false
  } = options;

  console.log(`\n🌐 Analyzing URL: ${url}`);
  console.log(`📱 Device: ${device}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport based on device type
    if (device === 'mobile') {
      await page.setViewport({
        width: 390,   // iPhone 14 Pro width
        height: 844,  // iPhone 14 Pro height
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      });
      console.log('📱 Using mobile viewport (390x844)');
    } else {
      await page.setViewport({
        width: 1440,
        height: 900,
        deviceScaleFactor: 2
      });
      console.log('💻 Using desktop viewport (1440x900)');
    }

    console.log('📸 Loading page...');
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any animations/dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Dismiss common popups/overlays
    if (dismissPopups) {
      console.log('🚫 Dismissing popups...');
      await dismissCommonPopups(page);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Optional: scroll to load lazy content
    if (scroll) {
      console.log('📜 Scrolling to load content...');
      await autoScroll(page);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Take screenshot for reference
    const screenshotPath = join(__dirname, 'output', 'url-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📷 Screenshot saved: ${screenshotPath}`);

    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: window.innerHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    }));

    console.log(`📐 Page dimensions: ${dimensions.viewportWidth}x${dimensions.viewportHeight}`);

    // Extract element data from the page
    console.log('🔍 Analyzing DOM structure...');

    const layers = await page.evaluate(() => {
      const results = [];
      const processed = new Set();

      function getZDepth(element) {
        const style = window.getComputedStyle(element);
        const zIndex = parseInt(style.zIndex) || 0;
        const position = style.position;

        // Higher z-index = closer to viewer
        if (position === 'fixed' || position === 'sticky') return 10;
        if (zIndex > 100) return 9;
        if (zIndex > 10) return 8;
        if (zIndex > 0) return 7;

        // Use stacking context and element type
        const tagName = element.tagName.toLowerCase();
        if (['button', 'a'].includes(tagName)) return 8;
        if (tagName === 'input' || tagName === 'textarea') return 7;
        if (element.hasAttribute('role') && element.getAttribute('role') === 'button') return 8;
        if (tagName === 'nav' || tagName === 'header') return 6;
        if (tagName === 'img') return 4;
        if (tagName === 'section' || tagName === 'article') return 3;

        return 5; // default mid-level
      }

      function getElementType(element) {
        const tagName = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        const className = element.className.toString().toLowerCase();

        if (tagName === 'button' || role === 'button' || className.includes('button') || className.includes('btn')) {
          return 'button';
        }
        if (tagName === 'a') return 'button'; // Links act like buttons in UI
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
          return 'input_field';
        }
        if (tagName === 'img') return 'hero_image';
        if (tagName === 'nav' || role === 'navigation') return 'nav_bar';
        if (tagName === 'header' || role === 'banner') return 'header';
        if (tagName === 'footer' || role === 'contentinfo') return 'footer';
        if (className.includes('card')) return 'card';
        if (tagName === 'article') return 'card';
        if (tagName === 'section') return 'card';

        return 'text_block';
      }

      function isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.top < window.innerHeight &&
          rect.bottom > 0
        );
      }

      function getLabel(element) {
        // Get meaningful label for the element
        const text = element.innerText?.trim().substring(0, 60) || '';
        const ariaLabel = element.getAttribute('aria-label') || '';
        const alt = element.getAttribute('alt') || '';
        const title = element.getAttribute('title') || '';
        const placeholder = element.getAttribute('placeholder') || '';

        return ariaLabel || alt || title || placeholder || text || element.tagName.toLowerCase();
      }

      function isInteractive(element) {
        const tagName = element.tagName.toLowerCase();
        const role = element.getAttribute('role');

        return (
          ['button', 'a', 'input', 'textarea', 'select'].includes(tagName) ||
          role === 'button' ||
          element.hasAttribute('onclick') ||
          window.getComputedStyle(element).cursor === 'pointer'
        );
      }

      function shouldInclude(element) {
        const rect = element.getBoundingClientRect();

        // Minimum size threshold
        if (rect.width < 20 || rect.height < 20) return false;

        // Must be visible in viewport
        if (!isVisible(element)) return false;

        // Skip certain elements
        const tagName = element.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) return false;

        return true;
      }

      function extractElement(element) {
        if (!shouldInclude(element)) return null;

        const rect = element.getBoundingClientRect();
        const id = element.id || element.className || element.tagName;

        // Avoid duplicates
        const key = `${rect.left}-${rect.top}-${rect.width}-${rect.height}`;
        if (processed.has(key)) return null;
        processed.add(key);

        return {
          element_type: getElementType(element),
          label: getLabel(element),
          bounding_box: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          z_depth: getZDepth(element),
          is_interactive: isInteractive(element)
        };
      }

      // Priority order: interactive elements first, then layout, then content
      const selectors = [
        'button, [role="button"], .btn, .button',
        'a[href]',
        'input:not([type="hidden"]), textarea, select',
        'nav, header, footer',
        'img[src]',
        '.card, article',
        'section',
        'div[class*="container"]',
        'h1, h2, h3'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const data = extractElement(element);
          if (data) {
            results.push(data);
          }
        });
      });

      // Sort by z-depth (highest first) and size
      results.sort((a, b) => {
        if (a.z_depth !== b.z_depth) return b.z_depth - a.z_depth;
        return (b.bounding_box.width * b.bounding_box.height) -
               (a.bounding_box.width * a.bounding_box.height);
      });

      // Limit to top 25 most relevant layers
      return results.slice(0, 25);
    });

    console.log(`✅ Detected ${layers.length} layers from DOM`);

    await browser.close();

    return {
      layers,
      dimensions: {
        width: dimensions.viewportWidth,
        height: dimensions.viewportHeight
      },
      url,
      method: 'dom-extraction'
    };

  } catch (error) {
    await browser.close();
    throw error;
  }
}

function generateVisualization(detectionResult, comparison = null) {
  const { layers, dimensions, url, method } = detectionResult;

  console.log(`\n📊 Detected ${layers.length} layers using ${method}:`);
  layers.forEach((layer, i) => {
    console.log(`  ${i + 1}. ${layer.label} (${layer.element_type}) - Z-depth: ${layer.z_depth}`);
  });

  const comparisonSection = comparison ? `
    <div style="margin-top: 40px; padding: 20px; background: #1a1a1a; border-radius: 12px; border: 1px solid #333;">
      <h2 style="font-size: 20px; margin-bottom: 15px;">Comparison with AI Detection</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="color: #667eea; margin-bottom: 10px;">DOM Extraction</h3>
          <p style="color: #888; font-size: 14px;">Layers: ${layers.length}</p>
          <p style="color: #888; font-size: 14px;">Method: Browser DOM API</p>
          <p style="color: #888; font-size: 14px;">Accuracy: Pixel-perfect</p>
        </div>
        <div>
          <h3 style="color: #764ba2; margin-bottom: 10px;">AI Vision</h3>
          <p style="color: #888; font-size: 14px;">Layers: ${comparison.layerCount}</p>
          <p style="color: #888; font-size: 14px;">Method: Gemini Vision API</p>
          <p style="color: #888; font-size: 14px;">Accuracy: ~80%</p>
        </div>
      </div>
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LayerFlow POC - URL Detection Results</title>
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
      margin-bottom: 10px;
      font-size: 16px;
    }

    .url-info {
      color: #667eea;
      margin-bottom: 40px;
      font-size: 14px;
      word-break: break-all;
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

    .badge {
      display: inline-block;
      background: #10b981;
      color: #fff;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 10px;
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
    <p class="subtitle">DOM-Based UI Layer Detection<span class="badge">Pixel Perfect</span></p>
    <p class="url-info">Source: ${url}</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Detected Layers</div>
        <div class="stat-value">${layers.length}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Page Size</div>
        <div class="stat-value">${dimensions.width}×${dimensions.height}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Interactive Elements</div>
        <div class="stat-value">${layers.filter(l => l.is_interactive).length}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Detection Method</div>
        <div class="stat-value" style="font-size: 18px;">DOM API</div>
      </div>
    </div>

    ${comparisonSection}

    <div class="content">
      <div class="canvas-container">
        <div class="canvas-wrapper">
          <img id="screenshot" src="url-screenshot.png" alt="Screenshot">
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

      const colors = [
        [59, 130, 246],
        [102, 126, 234],
        [139, 92, 246],
        [168, 85, 247],
        [236, 72, 153],
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

        ctx.strokeStyle = isActive ? '#667eea' : getDepthColor(layer.z_depth);
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = isActive
          ? 'rgba(102, 126, 234, 0.15)'
          : getDepthColor(layer.z_depth).replace('0.5', '0.08');
        ctx.fillRect(x, y, width, height);

        if (showLabels || isActive) {
          ctx.fillStyle = isActive ? '#667eea' : '#fff';
          ctx.font = \`bold \${Math.max(10, 12 * scaleX)}px sans-serif\`;
          ctx.fillText(layer.label.substring(0, 30), x + 8, y + 20);

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
          <div>\${layer.label.substring(0, 50)}</div>
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

    if (img.complete) {
      drawLayers();
      renderLayersList();
    }
  </script>
</body>
</html>`;

  const outputPath = join(__dirname, 'output', 'url-visualization.html');
  writeFileSync(outputPath, html);

  console.log(`\n✨ Visualization generated: ${outputPath}`);
  console.log(`   Open this file in your browser to see the results!`);

  const jsonPath = join(__dirname, 'output', 'url-detection.json');
  writeFileSync(jsonPath, JSON.stringify(detectionResult, null, 2));
  console.log(`📄 Raw JSON saved: ${jsonPath}`);

  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run detect-url <url> [options]');
    console.log('\nOptions:');
    console.log('  --mobile          Use mobile viewport (390x844)');
    console.log('  --desktop         Use desktop viewport (1440x900) [default]');
    console.log('  --no-popups       Skip popup dismissal');
    console.log('  --scroll          Scroll page to load lazy content');
    console.log('\nExamples:');
    console.log('  npm run detect-url https://example.com');
    console.log('  npm run detect-url https://example.com -- --mobile');
    console.log('  npm run detect-url https://example.com -- --mobile --scroll');
    process.exit(1);
  }

  const url = args[0];
  const options = {
    device: args.includes('--mobile') ? 'mobile' : 'desktop',
    dismissPopups: !args.includes('--no-popups'),
    scroll: args.includes('--scroll')
  };

  try {
    const outputDir = join(__dirname, 'output');
    if (!existsSync(outputDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(outputDir);
    }

    const result = await detectLayersFromUrl(url, options);
    await generateVisualization(result);

    console.log('\n✅ URL detection complete!');
    console.log('\n💡 This method uses actual DOM positions, so bounding boxes are pixel-perfect!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('timeout')) {
      console.error('   The page took too long to load. Try a different URL or check your connection.');
    }
    process.exit(1);
  }
}

main();
