const { chromium } = require('playwright');
const path = require('path');

const dir = 'd:\\65\\scratch\\screenshots';
const BASE = 'http://localhost:5174';

async function shot(page, name, desc) {
  await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true });
  console.log('SHOT: ' + name + ' - ' + desc);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-SA' });
  const page = await ctx.newPage();

  // Check main route
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2500);
  const url = page.url();
  console.log('Landing URL:', url);
  await shot(page, 'A-home', 'Home/Dashboard');

  const pages = [
    ['/pos',                    'B-pos',        'POS نقطة البيع'],
    ['/sales',                  'C-sales',      'المبيعات'],
    ['/sales/new',              'C2-sale-form', 'فاتورة مبيعات جديدة'],
    ['/purchases',              'D-purchases',  'المشتريات'],
    ['/purchases/new',          'D2-purch-form','فاتورة شراء جديدة'],
    ['/products',               'E-products',   'المنتجات'],
    ['/inventory',              'F-inventory',  'حركة المخزون'],
    ['/categories',             'G-categories', 'التصنيفات'],
    ['/customers',              'H-customers',  'العملاء'],
    ['/suppliers',              'I-suppliers',  'الموردون'],
    ['/suppliers/new',          'I2-sup-form',  'مورد جديد'],
    ['/accounts',               'J-accounts',   'شجرة الحسابات'],
    ['/journal',                'K-journal',    'القيود اليومية'],
    ['/journal/new',            'K2-jrnl-form', 'قيد جديد'],
    ['/payments',               'L-payments',   'سندات القبض والصرف'],
    ['/expenses',               'M-expenses',   'المصروفات'],
    ['/reports',                'N-reports',    'التقارير'],
    ['/settings',               'O-settings',   'الإعدادات'],
    ['/hr',                     'P-hr',         'HR Dashboard'],
    ['/crm/whatsapp-marketing', 'Q-whatsapp',   'واتساب ماركتينج'],
    ['/users',                  'R-users',      'المستخدمون'],
  ];
  
  for (const [route, name, desc] of pages) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      const curUrl = page.url();
      if (curUrl.includes('/login')) {
        console.log('REDIRECT TO LOGIN: ' + name);
      }
      await shot(page, name, desc);
    } catch (e) {
      console.log('FAIL: ' + name + ' - ' + e.message.slice(0, 100));
    }
  }
  
  await browser.close();
  console.log('ALL DONE');
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
