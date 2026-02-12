import { chromium } from 'playwright';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'assets');

const DEMO_EMAIL = process.env.CAPTURE_DEMO_EMAIL || 'demo@reeflab.io';
const DEMO_PASS = process.env.CAPTURE_DEMO_PASS;
const ADMIN_EMAIL = process.env.CAPTURE_ADMIN_EMAIL;
const ADMIN_PASS = process.env.CAPTURE_ADMIN_PASS;

if (!DEMO_PASS) {
  console.error('Missing CAPTURE_DEMO_PASS env var. Set credentials via environment variables.');
  console.error('  CAPTURE_DEMO_EMAIL  (default: demo@reeflab.io)');
  console.error('  CAPTURE_DEMO_PASS   (required)');
  console.error('  CAPTURE_ADMIN_EMAIL (required for admin screenshot)');
  console.error('  CAPTURE_ADMIN_PASS  (required for admin screenshot)');
  process.exit(1);
}

/** Login via API and store token + user in localStorage so the SPA picks it up */
async function loginViaToken(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  for (let attempt = 1; attempt <= 5; attempt++) {
    const ok = await page.evaluate(async ({ email, password }) => {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      const loginResp = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (!loginResp.ok) return false;
      const { access_token } = await loginResp.json();
      const meResp = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!meResp.ok) return false;
      const user = await meResp.json();
      localStorage.setItem('aquascope_token', access_token);
      localStorage.setItem('aquascope_user', JSON.stringify(user));
      return true;
    }, { email, password });

    if (ok) {
      console.log(`  Authenticated as ${email} (attempt ${attempt})`);
      return;
    }
    console.log(`  Login attempt ${attempt} failed, retrying in 3s...`);
    await page.waitForTimeout(3000);
  }
  throw new Error(`Login failed for ${email} after 5 attempts`);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();

  // Login as demo user
  console.log('Logging in as demo user...');
  await loginViaToken(page, DEMO_EMAIL, DEMO_PASS);
  // Navigate to dashboard (reload so SPA picks up the token from localStorage)
  console.log('Capturing dashboard...');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  // Wait for redirect if not authenticated, then retry
  if (page.url().includes('/login')) {
    console.log('  Redirected to login, retrying...');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/screenshot-dashboard.png` });

  // Tank detail - click the first tank name on dashboard
  console.log('Capturing tank detail...');
  const tankHeading = await page.$('text=Coral Paradise');
  if (tankHeading) {
    await tankHeading.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/screenshot-tank.png` });
  } else {
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

  // Maintenance
  console.log('Capturing maintenance...');
  await page.goto(`${BASE}/maintenance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/screenshot-maintenance.png` });

  // Equipment
  console.log('Capturing equipment...');
  await page.goto(`${BASE}/equipment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/screenshot-equipment.png` });

  // Consumables
  console.log('Capturing consumables...');
  await page.goto(`${BASE}/consumables`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/screenshot-consumables.png` });

  // Admin page
  if (ADMIN_EMAIL && ADMIN_PASS) {
    console.log('Switching to admin account...');
    await page.evaluate(() => localStorage.clear());
    await loginViaToken(page, ADMIN_EMAIL, ADMIN_PASS);

    console.log('Capturing admin (modules tab)...');
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    if (page.url().includes('/login')) {
      console.log('  Redirected to login, retrying...');
      await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(2000);
    const modulesBtn = await page.$('button:has-text("Modules")');
    if (modulesBtn) {
      await modulesBtn.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('  Modules tab not found, capturing current view');
    }
    await page.screenshot({ path: `${OUT}/screenshot-admin.png` });
  } else {
    console.log('Skipping admin screenshot (CAPTURE_ADMIN_EMAIL / CAPTURE_ADMIN_PASS not set)');
  }

  await browser.close();
  console.log('Done! Screenshots saved to landing/assets/');
})();
