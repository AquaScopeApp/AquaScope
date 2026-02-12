import { chromium } from 'playwright';

const BASE = 'http://localhost';
const OUT = '/Users/eprifti/prifticloud/HOBBIES/aqurophilie/Reefing/equipment/ReefPi/AquaScope/landing/assets';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'demo@reeflab.io');
  await page.fill('input[type="password"]', '***REDACTED***');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  console.log('  Current URL:', page.url());

  // Dashboard
  console.log('Capturing dashboard...');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/screenshot-dashboard.png` });

  // Tank detail - click the first tank name on dashboard
  console.log('Capturing tank detail...');
  const tankHeading = await page.$('text=Coral Paradise');
  if (tankHeading) {
    await tankHeading.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/screenshot-tank.png` });
  } else {
    // Try any link containing /tanks/
    const anyTank = await page.$('[href*="/tanks/"]');
    if (anyTank) {
      await anyTank.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/screenshot-tank.png` });
    } else {
      console.log('  No tank found, skipping');
    }
  }

  // Parameters
  console.log('Capturing parameters...');
  await page.goto(`${BASE}/parameters`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/screenshot-parameters.png` });

  // Livestock
  console.log('Capturing livestock...');
  await page.goto(`${BASE}/livestock`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/screenshot-livestock.png` });

  // Finances
  console.log('Capturing finances...');
  await page.goto(`${BASE}/finances`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/screenshot-finances.png` });

  await browser.close();
  console.log('Done! Screenshots saved to landing/assets/');
})();
