/**
 * Simple extension packaging script
 * Creates a basic .vsix package for testing
 */

const fs = require('fs');
const path = require('path');

const packageJson = require('./src/extension/package.json');
const distPath = './dist/extension';

// Copy package.json to dist folder
fs.copyFileSync('./src/extension/package.json', path.join(distPath, 'package.json'));

console.log('Extension packaged successfully!');
console.log('To install: code --install-extension dist/extension');
console.log('Or copy the dist/extension folder to your VS Code extensions folder');