import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory job tracking (for MVP - would use Redis in production)
const jobs = new Map();

// Simple render queue to prevent concurrent renders (protects server resources)
const renderQueue = [];
let isRendering = false;

/**
 * Process next render job in queue
 */
async function processNextRender() {
  if (isRendering || renderQueue.length === 0) {
    return;
  }

  isRendering = true;
  const { jobId, detectionId, animationConfig } = renderQueue.shift();

  await executeRender(jobId, detectionId, animationConfig);

  isRendering = false;
  processNextRender(); // Process next job if any
}

/**
 * Execute actual render (separated from queue logic)
 */
async function executeRender(jobId, detectionId, animationConfig) {
  const projectRoot = path.join(__dirname, '../..');
  const rendererDir = path.join(projectRoot, 'renderer');
  const outputPath = path.join(__dirname, '../uploads/videos', `${jobId}.mp4`);
  const configPath = path.join(__dirname, '../temp', `${jobId}-config.json`);
  const screenshotPath = path.join(__dirname, '../uploads/screenshots', `${detectionId}.png`);
  const detectionPath = path.join(__dirname, '../uploads/detections', `${detectionId}.json`);

  // Write animation config to temp file
  fs.writeFileSync(configPath, JSON.stringify(animationConfig, null, 2));

  // Copy screenshot to renderer public directory
  const rendererScreenshot = path.join(rendererDir, 'public', `${jobId}-screenshot.png`);
  const rendererDetection = path.join(rendererDir, 'public', `${jobId}-detection.json`);

  fs.copyFileSync(screenshotPath, rendererScreenshot);
  fs.copyFileSync(detectionPath, rendererDetection);

  // Copy animation config to renderer public directory so it can be fetched
  const rendererConfig = path.join(rendererDir, 'public', `${jobId}-config.json`);
  fs.copyFileSync(configPath, rendererConfig);

  // Build Remotion render command arguments
  // Files are in public/ directory, just pass the filenames
  const inputProps = {
    screenshotUrl: `${jobId}-screenshot.png`,
    detectionDataPath: `${jobId}-detection.json`,
    animationConfigPath: `${jobId}-config.json`,
    animationPreset: 'focus-layer'
  };

  const propsJson = JSON.stringify(inputProps);

  // Initialize job status
  jobs.set(jobId, {
    jobId,
    status: 'rendering',
    progress: 0,
    startedAt: new Date().toISOString()
  });

  // Execute render asynchronously using spawn
  console.log(`🎬 Starting render for job ${jobId}`);
  console.log(`   Props: ${propsJson}`);

  // Build command as a single string when using shell
  const commandArgs = [
    'npx remotion render ExplodedUI',
    `"${outputPath}"`,
    `--props='${propsJson}'`,
    '--timeout=120000',
    '--concurrency=1',
    '--gl=angle',  // ANGLE renderer for macOS
    '--ignore-gpu-blocklist',  // Enable GPU in headless mode
    '--log=verbose'
  ].join(' ');

  const renderProcess = spawn(commandArgs, {
    cwd: rendererDir,
    shell: true
  });

  let stdout = '';
  let stderr = '';

  renderProcess.stdout.on('data', (data) => {
    stdout += data.toString();
    console.log(`[Render ${jobId}]:`, data.toString().trim());
  });

  renderProcess.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error(`[Render ${jobId} stderr]:`, data.toString().trim());
  });

  renderProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`   ✗ Render failed for job ${jobId} with code ${code}`);
      console.error('   stderr:', stderr);

      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: 'failed',
        error: `Process exited with code ${code}`,
        completedAt: new Date().toISOString()
      });

      // Cleanup temp files
      try {
        fs.unlinkSync(configPath);
        fs.unlinkSync(rendererConfig);
        fs.unlinkSync(rendererScreenshot);
        fs.unlinkSync(rendererDetection);
      } catch (err) {
        console.error('Cleanup error:', err.message);
      }

      return;
    }

    console.log(`   ✓ Render complete for job ${jobId}`);
    console.log('   Output:', outputPath);

    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'complete',
      progress: 100,
      videoPath: outputPath,
      videoUrl: `/api/download/${jobId}`,
      completedAt: new Date().toISOString()
    });

    // Cleanup temp files
    try {
      fs.unlinkSync(configPath);
      fs.unlinkSync(rendererConfig);
      fs.unlinkSync(rendererScreenshot);
      fs.unlinkSync(rendererDetection);
    } catch (err) {
      console.error('Cleanup error:', err.message);
    }
  });
}

/**
 * Trigger Remotion video render (public API)
 * @param {string} detectionId - Detection ID
 * @param {object} animationConfig - Animation configuration
 * @returns {Promise<{jobId: string, status: string}>}
 */
export async function renderVideo(detectionId, animationConfig) {
  const jobId = uuidv4();

  // Initialize job status as queued
  jobs.set(jobId, {
    jobId,
    status: renderQueue.length > 0 || isRendering ? 'queued' : 'rendering',
    progress: 0,
    queuePosition: renderQueue.length,
    startedAt: new Date().toISOString()
  });

  // Add to queue
  renderQueue.push({ jobId, detectionId, animationConfig });

  // Start processing if not already running
  processNextRender();

  return {
    jobId,
    status: jobs.get(jobId).status,
    queuePosition: renderQueue.length
  };
}

/**
 * Get render job status
 * @param {string} jobId - Job ID
 * @returns {Promise<object>}
 */
export async function getRenderStatus(jobId) {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  return {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    videoUrl: job.videoUrl,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt
  };
}
