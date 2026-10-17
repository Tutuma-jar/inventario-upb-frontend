const fs = require('fs');
const path = require('path');

const outputDirectory = path.join(__dirname, 'dist');
const assets = ['index.html', 'styles.css', 'app.js'];

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

for (const asset of assets) {
  fs.copyFileSync(path.join(__dirname, asset), path.join(outputDirectory, asset));
}

console.log('Frontend listo en dist/.');
