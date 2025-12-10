import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run Puppeteer detection on a URL
 * @param {string} url - Website URL to analyze
 * @param {boolean} isMobile - Use mobile viewport
 * @returns {Promise<{detectionId: string, screenshotUrl: string, data: object}>}
 */
export async function detectFromUrl(url, isMobile = true) {
  const detectionId = uuidv4();
  const projectRoot = path.join(__dirname, '../..');
  const outputDir = path.join(__dirname, '../uploads');

  // Build command
  const mobileFlag = isMobile ? '--mobile' : '';
  const command = `cd "${projectRoot}" && node detect-url.js "${url}" ${mobileFlag}`;

  return new Promise((resolve, reject) => {
    console.log(`   Running: ${command.substring(0, 100)}...`);

    exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Detection failed:', error.message);
        console.error('stderr:', stderr);
        return reject(new Error(`Detection failed: ${error.message}`));
      }

      console.log('   Detection stdout:', stdout.substring(0, 200));

      try {
        // detect-url.js outputs to /output/ directory
        const tempDetectionPath = path.join(projectRoot, 'output', 'url-detection.json');
        const tempScreenshotPath = path.join(projectRoot, 'output', 'url-screenshot.png');

        if (!fs.existsSync(tempDetectionPath)) {
          throw new Error('Detection output file not found');
        }

        // Read detection data
        const data = JSON.parse(fs.readFileSync(tempDetectionPath, 'utf-8'));

        // Move files to backend uploads directory with unique ID
        const detectionPath = path.join(outputDir, 'detections', `${detectionId}.json`);
        const screenshotPath = path.join(outputDir, 'screenshots', `${detectionId}.png`);

        // Copy files
        fs.copyFileSync(tempDetectionPath, detectionPath);
        if (fs.existsSync(tempScreenshotPath)) {
          fs.copyFileSync(tempScreenshotPath, screenshotPath);
        }

        console.log(`   ✓ Detection complete: ${data.layers?.length || 0} layers found`);

        resolve({
          detectionId,
          screenshotUrl: `/api/files/screenshots/${detectionId}.png`,
          data
        });
      } catch (err) {
        console.error('Failed to process detection results:', err);
        reject(new Error(`Failed to process detection: ${err.message}`));
      }
    });
  });
}
