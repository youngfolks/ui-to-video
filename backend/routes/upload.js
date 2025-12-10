import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/screenshots');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const detectionId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${detectionId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

// POST /api/upload - Handle file uploads
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const detectionId = path.basename(req.file.filename, path.extname(req.file.filename));
    const screenshotUrl = `/api/files/screenshots/${req.file.filename}`;

    // TODO: Run AI detection on uploaded image
    // For now, return placeholder detection data
    const detectionData = {
      layers: [],
      dimensions: { width: 1080, height: 1920 },
      method: 'upload'
    };

    // Save detection data
    const detectionPath = path.join(__dirname, '../uploads/detections', `${detectionId}.json`);
    fs.writeFileSync(detectionPath, JSON.stringify(detectionData, null, 2));

    res.json({
      detectionId,
      screenshotUrl,
      detectionData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
