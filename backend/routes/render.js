import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { renderVideo, getRenderStatus } from '../services/renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// POST /api/render - Trigger video render
router.post('/render', async (req, res) => {
  try {
    const { detectionId, animationConfig } = req.body;

    if (!detectionId) {
      return res.status(400).json({ error: 'detectionId is required' });
    }

    if (!animationConfig) {
      return res.status(400).json({ error: 'animationConfig is required' });
    }

    // Verify detection exists
    const detectionPath = path.join(__dirname, '../uploads/detections', `${detectionId}.json`);
    if (!fs.existsSync(detectionPath)) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    console.log(`🎬 Starting render for detection ${detectionId}`);
    console.log(`   Animations: ${animationConfig.animations?.length || 0} layers`);

    const result = await renderVideo(detectionId, animationConfig);

    res.json({
      jobId: result.jobId,
      status: result.status
    });
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/render-status/:jobId - Check render progress
router.get('/render-status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const status = await getRenderStatus(jobId);

    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/download/:jobId - Download rendered video
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const videoPath = path.join(__dirname, '../uploads/videos', `${jobId}.mp4`);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video not found or still rendering' });
    }

    const stat = fs.statSync(videoPath);
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="ui-animation-${jobId}.mp4"`
    });

    const readStream = fs.createReadStream(videoPath);
    readStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
