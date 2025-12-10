import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const render = async () => {
  console.log('🎬 Starting video render...');
  console.log('');

  const compositionId = 'ExplodedUI';
  const outputPath = path.join(__dirname, '..', 'output', 'video.mp4');

  try {
    // Step 1: Bundle the Remotion project
    console.log('📦 Bundling Remotion project...');
    const bundleLocation = await bundle({
      entryPoint: path.join(__dirname, 'src', 'index.js'),
      webpackOverride: (config) => config,
    });
    console.log('✅ Bundle complete');
    console.log('');

    // Step 2: Select the composition
    console.log('🎥 Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
    });
    console.log(`✅ Composition: ${composition.id}`);
    console.log(`   Duration: ${composition.durationInFrames} frames @ ${composition.fps}fps = ${(composition.durationInFrames / composition.fps).toFixed(1)}s`);
    console.log(`   Size: ${composition.width}x${composition.height}`);
    console.log('');

    // Step 3: Render the video
    console.log('🎨 Rendering video...');
    console.log(`   Output: ${outputPath}`);
    console.log('');

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const percent = (progress * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${percent}% (${renderedFrames}/${composition.durationInFrames} frames)`);
      },
    });

    console.log('\n');
    console.log('✨ Render complete!');
    console.log(`   Video saved to: ${outputPath}`);
    console.log('');
    console.log('🎉 Success! Open the video to see your 3D UI animation.');

  } catch (error) {
    console.error('\n❌ Render failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

render();
