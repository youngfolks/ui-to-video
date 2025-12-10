import express from 'express';
import { detectFromUrl } from '../services/detector.js';

const router = express.Router();

// POST /api/detect-url - Run Puppeteer detection on URL
router.post('/detect-url', async (req, res) => {
  try {
    const { url, isMobile = true } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`🔍 Detecting layers from URL: ${url} (${isMobile ? 'mobile' : 'desktop'})`);

    const result = await detectFromUrl(url, isMobile);

    res.json({
      detectionId: result.detectionId,
      screenshotUrl: result.screenshotUrl,
      detectionData: result.data
    });
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({
      error: error.message || 'Detection failed'
    });
  }
});

// GET /api/status/:id - Check detection status (for future async processing)
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // For now, detection is synchronous
    // This endpoint is a placeholder for future async processing
    res.json({
      detectionId: id,
      status: 'complete'
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
