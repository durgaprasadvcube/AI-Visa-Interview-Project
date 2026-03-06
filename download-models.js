const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const files = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1'
];

async function download() {
    for (const file of files) {
        await new Promise((resolve) => {
            console.log(`Downloading ${file}...`);
            const dest = fs.createWriteStream(path.join(modelsDir, file));
            https.get(`${baseUrl}${file}`, (res) => {
                res.pipe(dest);
                dest.on('finish', () => { dest.close(); resolve(); });
            }).on('error', (err) => {
                console.error(`Error downloading ${file}:`, err);
                resolve();
            });
        });
    }
    console.log('All models downloaded.');
}

download();
