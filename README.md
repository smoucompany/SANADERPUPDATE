# نظام ERP المتكامل — Arabic Business Management System

نظام إدارة أعمال متكامل مبني بتقنيات حديثة، يدعم اللغة العربية بالكامل مع واجهة RTL احترافية.

## المميزات

- **لوحة تحكم** — إحصاءات يومية/شهرية، مخططات بيانية، تنبيهات المخزون
- **نقطة البيع (POS)** — إدارة الوردیات، طرق دفع متعددة، فواتير محفوظة
- **المبيعات** — فواتير بيع كاملة، تصدير PDF/Excel، متابعة الديون
- **المشتريات** — فواتير الموردين، تحديث تلقائي للمخزون
- **المخزون** — منتجات، فئات، باركود، تنبيهات نقص المخزون
- **المحاسبة** — دليل الحسابات، قيود يومية، سندات قبض وصرف، مصروفات
- **التقارير** — تقارير مبيعات، مشتريات، مخزون، عملاء، أرباح وخسائر
- **العملاء والموردون** — إدارة كاملة مع تتبع الديون والمستحقات
- **الإعدادات** — بيانات الشركة، إعدادات الفواتير، المظهر، الأمان، النسخ الاحتياطي
- **المستخدمون** — إدارة الأدوار والصلاحيات (مدير، محاسب، كاشير، موظف)

## التقنيات

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: TailwindCSS + CSS Variables
- **Animation**: Framer Motion
- **State**: Zustand + TanStack Query v5
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Charts**: Recharts
- **Export**: jsPDF + xlsx
- **PWA**: vite-plugin-pwa

## متطلبات التشغيل

- Node.js 18+
- حساب Supabase (مجاني)

## خطوات الإعداد

### 1. استنساخ المشروع

```bash
git clone <repo-url>
cd erp-system
npm install
```

### 2. إعداد Supabase

1. أنشئ مشروعاً جديداً على [supabase.com](https://supabase.com)
2. في **SQL Editor**، نفّذ ملفات المهاجرة بالترتيب:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`

### 3. متغيرات البيئة

```bash
cp .env.example .env
```

عدّل ملف `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. تشغيل المشروع

```bash
npm run dev
```

افتح المتصفح على `http://localhost:5173`

### 5. إنشاء أول حساب

- اذهب إلى `/register`
- أدخل بيانات المستخدم والشركة
- سيتم إنشاء جميع البيانات الافتراضية تلقائياً

## النشر على Vercel

```bash
npm run build
vercel deploy --prod
```

أضف متغيرات البيئة في لوحة تحكم Vercel.

## النشر على InfinityFree

إذا كنت ستستخدم InfinityFree لاستضافة النسخة الرئيسية فقط:

1. شغّل:
   ```bash
   npm run build
   ```
2. ارفع محتوى مجلد `dist/` إلى مجلد `htdocs/` في حساب InfinityFree.
3. تأكد أن الملف `.htaccess` موجود في جذر `htdocs/` ليعمل إعادة التوجيه للصفحات الداخلية.
4. لا تنشئ موقع Node.js على InfinityFree، فهو لا يدعم تشغيل `server.js`.

> ملاحظة: إذا أردت بوابة تحديث خارجية مستقلة، فهي تحتاج استضافة تدعم Node.js مثل Render أو Railway أو Fly.io.

## هيكل المشروع

```
src/
├── components/
│   ├── layout/         # Sidebar, Header, MainLayout
│   └── shared/         # DataTable, Modal, StatCard, ...
├── hooks/              # Custom React hooks
├── lib/                # supabase client, utils
├── pages/
│   ├── auth/           # Login, Register
│   ├── pos/            # Point of Sale
│   ├── sales/          # Sales management
│   ├── purchases/      # Purchase management
│   ├── inventory/      # Products, Categories, Inventory
│   ├── customers/      # Customer management
│   ├── suppliers/      # Supplier management
│   ├── accounting/     # Accounts, Journal, Payments, Expenses
│   ├── reports/        # Reports
│   └── settings/       # Settings, Users
├── store/              # Zustand stores (auth, pos, settings)
└── types/              # TypeScript interfaces
supabase/
└── migrations/         # SQL migration files
```

## الأدوار والصلاحيات

| الدور | الصلاحيات |
|-------|-----------|
| مدير النظام | كامل الصلاحيات |
| مدير | المبيعات، المشتريات، التقارير |
| محاسب | المحاسبة، التقارير |
| كاشير | نقطة البيع فقط |
| موظف | عرض لوحة التحكم |

## الامتثال الضريبي (ZATCA)

النظام يدعم متطلبات هيئة الزكاة والضريبة والجمارك السعودية:
- QR Code بتنسيق TLV في الفواتير
- رقم ضريبي للشركة
- نسبة ضريبة القيمة المضافة القابلة للتخصيص

## الترخيص

MIT License
