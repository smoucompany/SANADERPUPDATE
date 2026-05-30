const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const dir = 'd:\\65\\scratch\\screenshots';
const BASE = 'http://localhost:5174';

async function shot(page, name, desc) {
  await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true });
  console.log('SHOT: ' + name + ' - ' + desc);
}

(async () => {
  // Use real Chrome profile to get saved session
  const browser = await chromium.launchPersistentContext(
    process.env.LOCALAPPDATA + '\\\\Google\\\\Chrome\\\\User Data\\\\Default',
    {
      executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      headless: true,
      viewport: { width: 1440, height: 900 },
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  );
  
  const page = await browser.newPage();
  
  // Check if we land on dashboard or login
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2500);
  await shot(page, 'A-dashboard', 'Dashboard');
  const url = page.url();
  console.log('Current URL:', url);
  
  if (!url.includes('/login')) {
    // We are logged in! Take all pages
    const pages = [
      ['/pos', 'B-pos', 'POS - نقطة البيع'],
      ['/sales', 'C-sales', 'Sales - المبيعات'],
      ['/purchases', 'D-purchases', 'Purchases - المشتريات'],
      ['/products', 'E-products', 'Products - المنتجات'],
      ['/inventory', 'F-inventory', 'Inventory - المخزون'],
      ['/customers', 'G-customers', 'Customers - العملاء'],
      ['/suppliers', 'H-suppliers', 'Suppliers - الموردون'],
      ['/journal', 'I-journal', 'Journal - القيود'],
      ['/accounts', 'J-accounts', 'Accounts - الحسابات'],
      ['/payments', 'K-payments', 'Payments - المدفوعات'],
      ['/expenses', 'L-expenses', 'Expenses - المصاريف'],
      ['/reports', 'M-reports', 'Reports - التقارير'],
      ['/settings', 'N-settings', 'Settings - الإعدادات'],
      ['/hr', 'O-hr', 'HR Dashboard - الموارد البشرية'],
      ['/crm/whatsapp-marketing', 'P-whatsapp', 'WhatsApp Marketing'],
      ['/users', 'Q-users', 'Users - المستخدمون'],
    ];
    
    for (const [route, name, desc] of pages) {
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 12000 });
        await page.waitForTimeout(1800);
        await shot(page, name, desc);
      } catch (e) {
        console.log('FAIL: ' + name + ' - ' + e.message.slice(0, 80));
      }
    }
  }
  
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
