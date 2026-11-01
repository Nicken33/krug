const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const staging = path.join(root, 'build-staging');
const destAsar = path.join(root, 'dist-electron', 'win-unpacked', 'resources', 'app.asar');

console.log('[Build] Preparing files for app.asar packaging...');

if (fs.existsSync(staging)) {
  fs.rmSync(staging, { recursive: true, force: true });
}

fs.mkdirSync(staging, { recursive: true });

function copyItem(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyItem(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy essential folders
copyItem(path.join(root, 'electron'), path.join(staging, 'electron'));
copyItem(path.join(root, 'server'), path.join(staging, 'server'));
copyItem(path.join(root, 'client', 'dist'), path.join(staging, 'client', 'dist'));
copyItem(path.join(root, 'package.json'), path.join(staging, 'package.json'));

// Copy root node_modules needed in production
console.log('[Build] Copying dependencies...');
const stagingNodeModules = path.join(staging, 'node_modules');
fs.mkdirSync(stagingNodeModules, { recursive: true });

const rootNodeModules = path.join(root, 'node_modules');
const entries = fs.readdirSync(rootNodeModules);

for (const entry of entries) {
  if (entry.startsWith('.') || entry === 'electron' || entry === 'electron-builder' || entry.startsWith('@electron')) {
    continue;
  }
  copyItem(path.join(rootNodeModules, entry), path.join(stagingNodeModules, entry));
}

console.log('[Build] Packing staging folder into app.asar via asar...');
execSync(`npx asar pack "${staging}" "${destAsar}"`, { stdio: 'inherit' });

console.log('[Build] Cleaning up staging directory...');
fs.rmSync(staging, { recursive: true, force: true });

console.log('[Build] SUCCESS: app.asar updated at', destAsar);
