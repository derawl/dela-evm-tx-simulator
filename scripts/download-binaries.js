#!/usr/bin/env node

/**
 * Binary Download Script
 * Downloads and extracts Foundry binaries (anvil, cast) for bundling
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration for Foundry releases
const FOUNDRY_VERSION = 'v1.3.6';
const BINARY_DIR = path.join(__dirname, '../binaries');

const PLATFORMS = {
  win32: {
    url: `https://github.com/foundry-rs/foundry/releases/download/${FOUNDRY_VERSION}/foundry_${FOUNDRY_VERSION}_win32_amd64.zip`,
    extractCmd: 'powershell Expand-Archive',
    binaries: ['anvil.exe', 'cast.exe']
  },
  darwin: {
    url: `https://github.com/foundry-rs/foundry/releases/download/${FOUNDRY_VERSION}/foundry_${FOUNDRY_VERSION}_darwin_amd64.tar.gz`,
    extractCmd: 'tar -xzf',
    binaries: ['anvil', 'cast']
  },
  linux: {
    url: `https://github.com/foundry-rs/foundry/releases/download/${FOUNDRY_VERSION}/foundry_${FOUNDRY_VERSION}_linux_amd64.tar.gz`,
    extractCmd: 'tar -xzf',
    binaries: ['anvil', 'cast']
  }
};

/**
 * Download file from URL
 */
function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log(`Target: ${targetPath}`);
    
    const file = fs.createWriteStream(targetPath);
    
    const handleResponse = (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`Redirecting to: ${response.headers.location}`);
        return https.get(response.headers.location, handleResponse).on('error', (err) => {
          fs.unlinkSync(targetPath);
          reject(err);
        });
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Downloaded successfully: ${targetPath}`);
        resolve(targetPath);
      });
    };
    
    https.get(url, handleResponse).on('error', (err) => {
      fs.unlinkSync(targetPath);
      reject(err);
    });
  });
}

/**
 * Extract archive and move binaries
 */
function extractBinaries(archivePath, platform) {
  const platformConfig = PLATFORMS[platform];
  const extractDir = path.join(BINARY_DIR, 'temp');
  
  // Create extraction directory
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }

  try {
    // Extract archive
    console.log(`Extracting: ${archivePath}`);
    
    if (platform === 'win32') {
      // Handle ZIP files on Windows
      execSync(`powershell "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'inherit' });
    } else {
      // Handle tar.gz files on Unix-like systems
      execSync(`${platformConfig.extractCmd} "${archivePath}" -C "${extractDir}"`, { stdio: 'inherit' });
    }
    
    // Move binaries to binary directory
    platformConfig.binaries.forEach(binary => {
      const sourcePath = path.join(extractDir, binary);
      const targetPath = path.join(BINARY_DIR, binary);
      
      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, targetPath);
        
        // Make executable on Unix systems
        if (platform !== 'win32') {
          fs.chmodSync(targetPath, 0o755);
        }
        
        console.log(`Moved: ${binary} -> ${targetPath}`);
      } else {
        console.warn(`Binary not found: ${sourcePath}`);
      }
    });
    
    // Clean up
    fs.unlinkSync(archivePath);
    fs.rmSync(extractDir, { recursive: true, force: true });
    
  } catch (error) {
    console.error(`Extraction failed: ${error.message}`);
    throw error;
  }
}

/**
 * Download binaries for a specific platform
 */
async function downloadForPlatform(platform) {
  const platformConfig = PLATFORMS[platform];
  if (!platformConfig) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const filename = path.basename(platformConfig.url);
  const targetPath = path.join(BINARY_DIR, filename);
  
  try {
    // Download archive
    await downloadFile(platformConfig.url, targetPath);
    
    // Extract binaries
    extractBinaries(targetPath, platform);
    
    console.log(`✅ Successfully downloaded binaries for ${platform}`);
    
  } catch (error) {
    console.error(`❌ Failed to download binaries for ${platform}: ${error.message}`);
    throw error;
  }
}

/**
 * Download binaries for all platforms or current platform
 */
async function downloadBinaries() {
  // Ensure binary directory exists
  if (!fs.existsSync(BINARY_DIR)) {
    fs.mkdirSync(BINARY_DIR, { recursive: true });
  }

  const args = process.argv.slice(2);
  const downloadAll = args.includes('--all');
  const currentPlatform = process.platform;

  console.log('🚀 Starting Foundry binary download...');
  console.log(`Version: ${FOUNDRY_VERSION}`);
  console.log(`Target directory: ${BINARY_DIR}`);

  try {
    if (downloadAll) {
      console.log('Downloading for all platforms...');
      
      for (const platform of Object.keys(PLATFORMS)) {
        await downloadForPlatform(platform);
      }
      
    } else {
      console.log(`Downloading for current platform: ${currentPlatform}`);
      await downloadForPlatform(currentPlatform);
    }
    
    console.log('🎉 Binary download completed successfully!');
    
  } catch (error) {
    console.error('💥 Binary download failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check if binaries are already available
 */
function checkBinaries() {
  const currentPlatform = process.platform;
  const platformConfig = PLATFORMS[currentPlatform];
  
  if (!platformConfig) {
    console.log(`❌ Platform ${currentPlatform} is not supported`);
    return false;
  }

  let allFound = true;
  
  platformConfig.binaries.forEach(binary => {
    const binaryPath = path.join(BINARY_DIR, binary);
    if (fs.existsSync(binaryPath)) {
      console.log(`✅ Found: ${binary}`);
    } else {
      console.log(`❌ Missing: ${binary}`);
      allFound = false;
    }
  });

  return allFound;
}

/**
 * Main execution
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    console.log('Checking for existing binaries...');
    const found = checkBinaries();
    process.exit(found ? 0 : 1);
    
  } else if (args.includes('--help')) {
    console.log(`
Usage: node download-binaries.js [options]

Options:
  --all      Download binaries for all platforms
  --check    Check if binaries are already available
  --help     Show this help message

Examples:
  node download-binaries.js            # Download for current platform
  node download-binaries.js --all      # Download for all platforms
  node download-binaries.js --check    # Check existing binaries
    `);
    process.exit(0);
    
  } else {
    downloadBinaries();
  }
}