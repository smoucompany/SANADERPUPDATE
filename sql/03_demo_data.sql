-- ============================================================
-- الملف الثالث: بيانات تجريبية (اختياري)
-- شغّل ثالثاً بعد 01 و 02
-- ============================================================

DO $$
DECLARE
  v_cid UUID; v_wid UUID; v_bid UUID;
  c_dairy UUID; c_grains UUID; c_beverages UUID; c_oils UUID; c_snacks UUID; c_cleaning UUID;
  u_piece UUID; u_kg UUID; u_liter UUID; u_pack UUID;
  p_milk UUID; p_cheese UUID; p_rice UUID; p_flour UUID; p_sugar UUID;
  p_water UUID; p_juice UUID; p_oil UUID; p_chips UUID; p_detergent UUID;
  cust1 UUID; cust2 UUID; cust3 UUID;
  sup1 UUID; sup2 UUID;
  inv1 UUID; inv2 UUID; inv3 UUID;
  pur1 UUID;
BEGIN

SELECT id INTO v_cid FROM companies WHERE name_ar ILIKE '%صحاري%' LIMIT 1;
IF v_cid IS NULL THEN RAISE EXCEPTION 'سجّل الحساب أولاً ثم شغّل هذا الملف'; END IF;

SELECT id INTO v_wid FROM warehouses WHERE company_id=v_cid AND is_default=TRUE LIMIT 1;
SELECT id INTO v_bid FROM cashboxes  WHERE company_id=v_cid AND is_default=TRUE LIMIT 1;

-- ── التصنيفات ──
INSERT INTO categories (company_id,name_ar,name_en) VALUES (v_cid,'منتجات الألبان','Dairy')       RETURNING id INTO c_dairy;
INSERT INTO categories (company_id,name_ar,name_en) VALUES (v_cid,'الحبوب والبقوليات','Grains')   RETURNING id INTO c_grains;
INSERT INTO categories (company_id,name_ar,name_en) VALUES (v_cid,'المشروبات','Beverages')         RETURNING id INTO c_beverages;
INSERT INTO categories (company_id,name_ar,name_en) VALUES (v_cid,'الزيوت والسمن','Oils')          RETURNING id INTO c_oils;
INSERT INTO categories (company_id,name_ar,name_en) VALUES (v_cid,'الوجبات الخفيفة','Snacks')      RETURNING id INTO c_snacks;
INSERT INTO categories (company_id,name_ar,name_en) VALUES (v_cid,'مواد التنظيف','Cleaning')       RETURNING id INTO c_cleaning;

-- ── الوحدات ──
SELECT id INTO u_piece FROM units WHERE company_id=v_cid AND name_ar='قطعة'     LIMIT 1;
SELECT id INTO u_kg    FROM units WHERE company_id=v_cid AND name_ar='كيلوجرام' LIMIT 1;
SELECT id INTO u_liter FROM units WHERE company_id=v_cid AND name_ar='لتر'      LIMIT 1;
SELECT id INTO u_pack  FROM units WHERE company_id=v_cid AND name_ar='علبة'     LIMIT 1;

-- ── المنتجات ──
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_dairy,    u_piece,'ALB001','6281000000001','حليب نادك كامل الدسم 1 لتر',  'NADEC Full Cream 1L',  3.50, 4.75,15,TRUE,50) RETURNING id INTO p_milk;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_dairy,    u_piece,'ALB002','6281000000002','جبن كيري 16 قطعة',            'Kiri Cheese 16pcs',   18.00,24.50,15,TRUE,20) RETURNING id INTO p_cheese;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_grains,   u_kg,   'HBB001','6281000000003','أرز أبو كاس 5 كجم',           'Abu Kass Rice 5kg',   16.00,22.00, 0,TRUE,30) RETURNING id INTO p_rice;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_grains,   u_kg,   'HBB002','6281000000004','دقيق المطاحن المتحدة 5 كجم',  'Flour 5kg',            8.50,12.00, 0,TRUE,25) RETURNING id INTO p_flour;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_grains,   u_kg,   'HBB003','6281000000005','سكر الوفرة 2 كجم',            'Sugar 2kg',            5.00, 7.50, 0,TRUE,40) RETURNING id INTO p_sugar;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_beverages,u_piece,'MSH001','6281000000006','مياه النخلة 1.5 لتر',         'Water 1.5L',           1.00, 1.50,15,TRUE,100) RETURNING id INTO p_water;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_beverages,u_piece,'MSH002','6281000000007','عصير تروبيكانا برتقال 1 لتر', 'Tropicana 1L',         7.00, 9.50,15,TRUE,25) RETURNING id INTO p_juice;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_oils,     u_liter,'ZYT001','6281000000008','زيت عافية نخيل 1.5 لتر',      'Afia Oil 1.5L',        9.00,13.00,15,TRUE,20) RETURNING id INTO p_oil;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_snacks,   u_piece,'WJB001','6281000000009','شيبسي مشكل 80 جم',            'Chipsy Mix 80g',       3.00, 4.50,15,TRUE,30) RETURNING id INTO p_chips;
INSERT INTO products (company_id,category_id,unit_id,code,barcode,name_ar,name_en,cost_price,selling_price,vat_rate,track_inventory,min_stock_alert)
  VALUES (v_cid,c_cleaning, u_piece,'TNZ001','6281000000010','مسحوق أريال 3 كجم',           'Ariel 3kg',           28.00,38.00,15,TRUE,15) RETURNING id INTO p_detergent;

-- ── المخزون الافتتاحي ──
INSERT INTO inventory (product_id,warehouse_id,quantity) VALUES
  (p_milk,v_wid,150),(p_cheese,v_wid,60),(p_rice,v_wid,80),
  (p_flour,v_wid,60),(p_sugar,v_wid,70),(p_water,v_wid,200),
  (p_juice,v_wid,75),(p_oil,v_wid,50),(p_chips,v_wid,80),(p_detergent,v_wid,40)
ON CONFLICT (product_id,warehouse_id,batch_number) DO UPDATE SET quantity=EXCLUDED.quantity;

-- ── العملاء ──
INSERT INTO customers (company_id,code,name_ar,phone,city,credit_limit,payment_days) VALUES
  (v_cid,'CUS001','مطعم البيت السعيد', '0501234561','الرياض',5000,30)  RETURNING id INTO cust1;
INSERT INTO customers (company_id,code,name_ar,phone,city,credit_limit,payment_days) VALUES
  (v_cid,'CUS002','سوبرماركت الحارة',  '0501234562','جدة',  8000,15)  RETURNING id INTO cust2;
INSERT INTO customers (company_id,code,name_ar,phone,city,credit_limit,payment_days) VALUES
  (v_cid,'CUS003','فندق النخيل',       '0501234563','الدمام',15000,45) RETURNING id INTO cust3;

-- ── الموردون ──
INSERT INTO suppliers (company_id,code,name_ar,phone,city,payment_days) VALUES
  (v_cid,'SUP001','شركة المراعي للألبان',    '0114567891','الرياض',30) RETURNING id INTO sup1;
INSERT INTO suppliers (company_id,code,name_ar,phone,city,payment_days) VALUES
  (v_cid,'SUP002','مطاحن الطحين المتحدة',   '0124567892','جدة',   45) RETURNING id INTO sup2;

-- ── فواتير المبيعات ──
INSERT INTO invoices (company_id,warehouse_id,cashbox_id,customer_id,invoice_number,invoice_date,due_date,status,payment_method,subtotal,discount_amount,tax_amount,total,paid_amount,remaining_amount)
  VALUES (v_cid,v_wid,v_bid,cust1,'INV-2026-0001','2026-05-01','2026-05-31','paid','cash',350.00,0,47.63,397.63,397.63,0) RETURNING id INTO inv1;
INSERT INTO invoice_items (invoice_id,product_id,product_name,quantity,unit_price,vat_rate,vat_amount,total) VALUES
  (inv1,p_milk, 'حليب نادك كامل الدسم 1 لتر',50,4.75,15,35.63,273.13),
  (inv1,p_water,'مياه النخلة 1.5 لتر',       30,1.50,15, 6.75, 51.75),
  (inv1,p_chips,'شيبسي مشكل 80 جم',          10,4.50,15, 6.75, 51.75);

INSERT INTO invoices (company_id,warehouse_id,cashbox_id,customer_id,invoice_number,invoice_date,due_date,status,payment_method,subtotal,discount_amount,tax_amount,total,paid_amount,remaining_amount)
  VALUES (v_cid,v_wid,v_bid,cust2,'INV-2026-0002','2026-05-10','2026-05-25','paid','mada',625.00,0,0,625.00,625.00,0) RETURNING id INTO inv2;
INSERT INTO invoice_items (invoice_id,product_id,product_name,quantity,unit_price,vat_rate,vat_amount,total) VALUES
  (inv2,p_rice, 'أرز أبو كاس 5 كجم',          20,22.00,0,0,440.00),
  (inv2,p_flour,'دقيق المطاحن المتحدة 5 كجم', 10,12.00,0,0,120.00),
  (inv2,p_sugar,'سكر الوفرة 2 كجم',            8, 7.50,0,0, 60.00),
  (inv2,p_oil,  'زيت عافية نخيل 1.5 لتر',      5,13.00,0,0, 65.00);

INSERT INTO invoices (company_id,warehouse_id,cashbox_id,customer_id,invoice_number,invoice_date,due_date,status,payment_method,subtotal,discount_amount,tax_amount,total,paid_amount,remaining_amount)
  VALUES (v_cid,v_wid,v_bid,cust3,'INV-2026-0003','2026-05-20','2026-07-19','partial','deferred',2000.00,0,187.50,2187.50,1000.00,1187.50) RETURNING id INTO inv3;
INSERT INTO invoice_items (invoice_id,product_id,product_name,quantity,unit_price,vat_rate,vat_amount,total) VALUES
  (inv3,p_water,    'مياه النخلة 1.5 لتر',      100,1.50,15, 22.50, 172.50),
  (inv3,p_juice,    'عصير تروبيكانا برتقال 1 لتر',50,9.50,15, 71.25, 546.25),
  (inv3,p_milk,     'حليب نادك كامل الدسم 1 لتر',100,4.75,15, 71.25, 546.25),
  (inv3,p_detergent,'مسحوق أريال 3 كجم',          15,38.00,15, 85.50, 655.50);

-- ── فواتير الشراء ──
INSERT INTO purchases (company_id,warehouse_id,supplier_id,purchase_number,purchase_date,due_date,status,payment_method,subtotal,discount_amount,tax_amount,total,paid_amount,remaining_amount)
  VALUES (v_cid,v_wid,sup1,'PUR-2026-0001','2026-05-01','2026-05-31','confirmed','transfer',2400.00,0,157.50,2557.50,2557.50,0) RETURNING id INTO pur1;
INSERT INTO purchase_items (purchase_id,product_id,product_name,quantity,unit_price,vat_rate,vat_amount,total) VALUES
  (pur1,p_milk,  'حليب نادك كامل الدسم 1 لتر',300,3.50,15,157.50,1207.50),
  (pur1,p_cheese,'جبن كيري 16 قطعة',            50,18.00,0,0,900.00),
  (pur1,p_juice, 'عصير تروبيكانا برتقال 1 لتر', 30, 7.00,0,0,210.00);

-- ── المصروفات ──
INSERT INTO expenses (company_id,cashbox_id,expense_number,expense_date,description,amount,vat_amount,total_amount,payment_method) VALUES
  (v_cid,v_bid,'EXP-2026-001','2026-05-01','إيجار المحل — مايو 2026',        8000.00,   0,8000.00,'transfer'),
  (v_cid,v_bid,'EXP-2026-002','2026-05-05','فاتورة الكهرباء والماء',          1200.00, 180,1380.00,'transfer'),
  (v_cid,v_bid,'EXP-2026-003','2026-05-10','رواتب الموظفين — مايو 2026',    12000.00,   0,12000.00,'transfer'),
  (v_cid,v_bid,'EXP-2026-004','2026-05-15','صيانة معدات التبريد',             650.00,97.5, 747.50,'cash'),
  (v_cid,v_bid,'EXP-2026-005','2026-05-20','إعلانات سوشيال ميديا',            500.00,  75,  575.00,'transfer'),
  (v_cid,v_bid,'EXP-2026-006','2026-05-25','قرطاسية ومستلزمات مكتبية',        180.00,  27,  207.00,'cash');

-- ── الإشعارات ──
INSERT INTO notifications (company_id,type,title,message,is_read,data) VALUES
  (v_cid,'warning','مخزون منخفض','منتج "حليب نادك" وصل للحد الأدنى',FALSE,'{}'),
  (v_cid,'success','دفعة مستلمة','تم استلام 1,000 ر.س من فندق النخيل',FALSE,'{}'),
  (v_cid,'error',  'فاتورة متأخرة','الفاتورة INV-2026-0003 تجاوزت تاريخ الاستحقاق',FALSE,'{}'),
  (v_cid,'info',   'طلب شراء جديد','تم إنشاء طلب شراء PUR-2026-0001',TRUE,'{}'),
  (v_cid,'success','اكتمال المخزون','تم استلام طلب الشراء من المراعي',TRUE,'{}');

RAISE NOTICE '✅ تم إضافة البيانات التجريبية: 10 منتجات | 3 عملاء | 2 موردين | 3 فواتير مبيعات | 1 فاتورة شراء | 6 مصروفات';

END $$;
