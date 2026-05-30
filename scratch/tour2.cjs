const { chromium } = require('playwright');
const path = require('path');

const dir = 'd:\\\\65\\\\scratch\\\\screenshots';
const BASE = 'http://localhost:5174';

async function shot(page, name) {
  await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: false });
  console.log('SHOT: ' + name);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Try with a persistent context to reuse any saved session
  const ctx = await browser.newContext({ 
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA',
    storageState: undefined
  });
  const page = await ctx.newPage();

  // Navigate directly to each route - screenshot whatever is shown
  // Dashboard (might redirect to login)
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await shot(page, '04-dashboard-direct');

  // Try register page
  await page.goto(BASE + '/register', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '00-register');

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
