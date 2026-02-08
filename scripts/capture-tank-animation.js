#!/usr/bin/env node

/**
 * Script to capture the DefaultTankAnimation as an animated GIF
 *
 * Requirements:
 * - Node.js installed
 * - npm packages: puppeteer, gifencoder, pngjs
 *
 * Install dependencies:
 *   npm install --save-dev puppeteer gifencoder pngjs
 *
 * Usage:
 *   node scripts/capture-tank-animation.js
 *
 * Output:
 *   docs/images/tank-animation.gif
 */

const puppeteer = require('puppeteer');
const GIFEncoder = require('gifencoder');
const { createWriteStream } = require('fs');
const { PNG } = require('pngjs');
const path = require('path');

const CONFIG = {
  // Animation settings
  width: 800,
  height: 450,
  duration: 10, // seconds to record
  fps: 15,

  // Output settings
  outputPath: path.join(__dirname, '../docs/images/tank-animation.gif'),

  // URL to capture (update if your dev server runs on a different port)
  url: 'http://localhost:5173', // Default Vite dev server

  // Selector for the tank animation
  // This assumes you're on a tank detail page without an image
  tankSelector: '.aspect-video', // Update based on actual DOM structure
};

async function captureAnimation() {
  console.log('🎬 Starting tank animation capture...');
  console.log(`   Duration: ${CONFIG.duration}s @ ${CONFIG.fps}fps`);
  console.log(`   Output: ${CONFIG.outputPath}`);

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: CONFIG.width,
    height: CONFIG.height,
    deviceScaleFactor: 1,
  });

  // Navigate to the page
  console.log('📱 Navigating to application...');
  await page.goto(CONFIG.url, { waitUntil: 'networkidle2' });

  // Wait for animation to be visible
  console.log('⏳ Waiting for animation element...');
  await page.waitForSelector(CONFIG.tankSelector, { timeout: 10000 });

  // Set up GIF encoder
  console.log('🎨 Setting up GIF encoder...');
  const encoder = new GIFEncoder(CONFIG.width, CONFIG.height);
  const stream = createWriteStream(CONFIG.outputPath);

  encoder.createReadStream().pipe(stream);
  encoder.start();
  encoder.setRepeat(0); // 0 = loop forever
  encoder.setDelay(1000 / CONFIG.fps); // Frame delay in ms
  encoder.setQuality(10); // 10 = best quality

  // Calculate number of frames
  const totalFrames = CONFIG.duration * CONFIG.fps;
  const frameDelay = 1000 / CONFIG.fps;

  console.log(`📸 Capturing ${totalFrames} frames...`);

  // Capture frames
  for (let i = 0; i < totalFrames; i++) {
    // Take screenshot
    const screenshot = await page.screenshot({
      encoding: 'binary',
      type: 'png',
    });

    // Parse PNG and add to encoder
    const png = PNG.sync.read(screenshot);
    encoder.addFrame(png.data);

    // Progress indicator
    if ((i + 1) % CONFIG.fps === 0) {
      console.log(`   Progress: ${i + 1}/${totalFrames} frames (${Math.round((i + 1) / totalFrames * 100)}%)`);
    }

    // Wait for next frame
    await new Promise(resolve => setTimeout(resolve, frameDelay));
  }

  // Finalize GIF
  console.log('✅ Finalizing GIF...');
  encoder.finish();

  await browser.close();

  // Wait for stream to finish
  await new Promise(resolve => stream.on('finish', resolve));

  console.log('🎉 Done! GIF saved to:', CONFIG.outputPath);
  console.log('');
  console.log('Next steps:');
  console.log('1. Optimize the GIF with: gifsicle -O3 --colors 256 docs/images/tank-animation.gif -o docs/images/tank-animation-optimized.gif');
  console.log('2. Replace the original with optimized version if smaller');
  console.log('3. Commit the GIF to your repository');
}

// Alternative: Simple instructions if dependencies aren't installed
async function showInstructions() {
  console.log('📋 Tank Animation Capture Instructions\n');
  console.log('This script requires additional dependencies. Install them with:');
  console.log('  npm install --save-dev puppeteer gifencoder pngjs\n');
  console.log('Or capture manually:');
  console.log('1. Start your dev server: cd frontend && npm run dev');
  console.log('2. Navigate to a tank without a custom image');
  console.log('3. Use screen recording software:');
  console.log('   - macOS: QuickTime Player → File → New Screen Recording');
  console.log('   - Windows: Xbox Game Bar (Win + G)');
  console.log('   - Linux: SimpleScreenRecorder or ffmpeg');
  console.log('4. Convert to GIF using one of:');
  console.log('   - ezgif.com (online)');
  console.log('   - ffmpeg: ffmpeg -i recording.mov -vf "fps=15,scale=800:-1:flags=lanczos" -c:v gif tank-animation.gif');
  console.log('   - ScreenToGif (Windows)');
  console.log('   - Gifski (macOS)');
  console.log('5. Optimize: gifsicle -O3 --colors 256 tank-animation.gif -o tank-animation-optimized.gif');
  console.log('6. Save to: docs/images/tank-animation.gif\n');
}

// Check if dependencies are available
try {
  require.resolve('puppeteer');
  require.resolve('gifencoder');
  require.resolve('pngjs');

  // Run the capture
  captureAnimation().catch(error => {
    console.error('❌ Error capturing animation:', error);
    console.log('\n📋 Falling back to manual instructions...\n');
    showInstructions();
    process.exit(1);
  });
} catch (e) {
  showInstructions();
}
