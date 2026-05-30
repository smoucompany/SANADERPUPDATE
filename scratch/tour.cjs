const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const dir = 'd:\\\\65\\\\scratch\\\\screenshots';
const BASE = 'http://localhost:5174';

async function shot(page, name) {
  await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: false });
  console.log('SHOT: ' + name);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-SA' });
  const page = await ctx.newPage();

  // Login page
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });
  await shot(page, '01-login');

  // Fill login
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="بريد"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await emailInput.fill('sumooucompany@gmail.com');
  await passInput.fill('123456');
  await shot(page, '02-login-filled');
  await page.locator('button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل")').first().click();
  await page.waitForTimeout(3000);
  await shot(page, '03-after-login');

  // Dashboard
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await shot(page, '04-dashboard');

  // POS
  await page.goto(BASE + '/pos', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(2000);
  await shot(page, '05-pos');

  // Sales
  await page.goto(BASE + '/sales', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '06-sales');

  // Purchases
  await page.goto(BASE + '/purchases', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '07-purchases');

  // Inventory/Products
  await page.goto(BASE + '/products', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '08-products');

  // Customers
  await page.goto(BASE + '/customers', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '09-customers');

  // Suppliers
  await page.goto(BASE + '/suppliers', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '10-suppliers');

  // Accounting - Journal
  await page.goto(BASE + '/journal', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '11-journal');

  // Reports
  await page.goto(BASE + '/reports', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '12-reports');

  // Settings
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '13-settings');

  // HR Dashboard
  await page.goto(BASE + '/hr', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '14-hr');

  // WhatsApp Marketing
  await page.goto(BASE + '/crm/whatsapp-marketing', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, '15-whatsapp');

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
