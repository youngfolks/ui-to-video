import https from 'https';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample UI screenshots for testing
const samples = {
  'airbnb': 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=1200',
  'saas-dashboard': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200',
  'mobile-app': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200',
};

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(filepath);

    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filepath, () => reject(err));
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => reject(err));
    });
  });
}

async function main() {
  const sampleName = process.argv[2] || 'saas-dashboard';

  if (!samples[sampleName]) {
    console.log('Available samples:', Object.keys(samples).join(', '));
    console.log(`Usage: node download-sample.js [${Object.keys(samples).join('|')}]`);
    process.exit(1);
  }

  const outputPath = join(__dirname, `sample-${sampleName}.jpg`);

  console.log(`Downloading ${sampleName} sample...`);

  try {
    await downloadImage(samples[sampleName], outputPath);
    console.log(`✅ Downloaded to: ${outputPath}`);
    console.log(`\nNow run: npm run detect ${outputPath}`);
  } catch (error) {
    console.error('❌ Download failed:', error.message);
  }
}

main();
