-- ============================================================
-- الملف السادس: شجرة الحسابات + قيود يومية تجريبية
-- شغّل بعد 04_create_admin.sql
-- ============================================================

DO $$
DECLARE
  v_cid UUID;

  -- Level 1
  a_assets UUID; a_liab UUID; a_equity UUID; a_rev UUID; a_exp UUID;

  -- Level 2 — Assets
  a_current UUID; a_fixed UUID;
  -- Level 2 — Liabilities
  a_curr_liab UUID; a_lt_liab UUID;
  -- Level 2 — Equity
  a_capital UUID;
  -- Level 2 — Revenue
  a_sales_rev UUID; a_other_rev UUID;
  -- Level 2 — Expenses
  a_sell_exp UUID; a_admin_exp UUID; a_fin_exp UUID;

  -- Level 3/4 — Detail
  a_cash UUID; a_bank_al UUID; a_ar UUID; a_inv_acc UUID;
  a_vat_in UUID; a_vat_out UUID; a_ap UUID; a_acc_sal UUID;
  a_paid_cap UUID; a_ret_earn UUID; a_curr_yr UUID;
  a_sales UUID; a_sales_ret UUID;
  a_cogs UUID;
  a_salaries UUID; a_rent UUID; a_utilities UUID;
  a_mkt UUID; a_bank_fees UUID;

  -- Journal entries
  j1 UUID; j2 UUID; j3 UUID; j4 UUID; j5 UUID;

  v_entry TEXT;
BEGIN

SELECT id INTO v_cid FROM companies ORDER BY created_at LIMIT 1;
IF v_cid IS NULL THEN RAISE EXCEPTION 'شغّل 04_create_admin.sql أولاً'; END IF;

-- حذف الحسابات القديمة بالترتيب الصحيح
DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id=v_cid);
DELETE FROM journal_entries WHERE company_id=v_cid;
DELETE FROM accounts WHERE company_id=v_cid AND level=4;
DELETE FROM accounts WHERE company_id=v_cid AND level=3;
DELETE FROM accounts WHERE company_id=v_cid AND level=2;
DELETE FROM accounts WHERE company_id=v_cid AND level=1;

-- ══ المستوى 1 — الأقسام الرئيسية ══════════════════════════
INSERT INTO accounts(company_id,code,name_ar,name_en,type,level,is_detail,is_active,balance) VALUES(v_cid,'1','الأصول','Assets','asset',1,FALSE,TRUE,0) RETURNING id INTO a_assets;
INSERT INTO accounts(company_id,code,name_ar,name_en,type,level,is_detail,is_active,balance) VALUES(v_cid,'2','الخصوم','Liabilities','liability',1,FALSE,TRUE,0) RETURNING id INTO a_liab;
INSERT INTO accounts(company_id,code,name_ar,name_en,type,level,is_detail,is_active,balance) VALUES(v_cid,'3','حقوق الملكية','Equity',  'equity',  1,FALSE,TRUE,0) RETURNING id INTO a_equity;
INSERT INTO accounts(company_id,code,name_ar,name_en,type,level,is_detail,is_active,balance) VALUES(v_cid,'4','الإيرادات','Revenue',  'revenue', 1,FALSE,TRUE,0) RETURNING id INTO a_rev;
INSERT INTO accounts(company_id,code,name_ar,name_en,type,level,is_detail,is_active,balance) VALUES(v_cid,'5','المصروفات','Expenses', 'expense', 1,FALSE,TRUE,0) RETURNING id INTO a_exp;

-- ══ المستوى 2 ══════════════════════════════════════════════
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_assets,'11','الأصول المتداولة',      'asset',    2,FALSE,TRUE,0) RETURNING id INTO a_current;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_assets,'12','الأصول الثابتة',         'asset',    2,FALSE,TRUE,0) RETURNING id INTO a_fixed;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_liab,  '21','الخصوم المتداولة',       'liability',2,FALSE,TRUE,0) RETURNING id INTO a_curr_liab;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_liab,  '22','الخصوم طويلة الأجل',     'liability',2,FALSE,TRUE,0) RETURNING id INTO a_lt_liab;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_equity,'31','رأس المال والاحتياطيات', 'equity',   2,FALSE,TRUE,0) RETURNING id INTO a_capital;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_rev,   '41','إيرادات المبيعات',       'revenue',  2,FALSE,TRUE,0) RETURNING id INTO a_sales_rev;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_rev,   '42','إيرادات أخرى',           'revenue',  2,FALSE,TRUE,0) RETURNING id INTO a_other_rev;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_exp,   '51','تكلفة المبيعات',          'expense',  2,FALSE,TRUE,0) RETURNING id INTO a_sell_exp;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_exp,   '52','مصروفات إدارية وعمومية', 'expense',  2,FALSE,TRUE,0) RETURNING id INTO a_admin_exp;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_exp,   '53','مصروفات مالية',           'expense',  2,FALSE,TRUE,0) RETURNING id INTO a_fin_exp;

-- ══ المستوى 3 — حسابات تفصيلية ════════════════════════════
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_current,'111','الصندوق الرئيسي',             'asset',    3,TRUE,TRUE,0) RETURNING id INTO a_cash;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_current,'112','بنك الراجحي - جاري',          'asset',    3,TRUE,TRUE,0) RETURNING id INTO a_bank_al;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_current,'113','الذمم المدينة - العملاء',     'asset',    3,TRUE,TRUE,0) RETURNING id INTO a_ar;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_current,'114','مخزون البضائع',               'asset',    3,TRUE,TRUE,0) RETURNING id INTO a_inv_acc;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_current,'115','ضريبة القيمة المضافة المدخلات','asset',   3,TRUE,TRUE,0) RETURNING id INTO a_vat_in;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_curr_liab,'211','الذمم الدائنة - الموردون',   'liability',3,TRUE,TRUE,0) RETURNING id INTO a_ap;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_curr_liab,'212','ضريبة القيمة المضافة المخرجات','liability',3,TRUE,TRUE,0) RETURNING id INTO a_vat_out;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_curr_liab,'213','رواتب مستحقة الدفع',        'liability',3,TRUE,TRUE,0) RETURNING id INTO a_acc_sal;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_capital, '311','رأس المال المدفوع',          'equity',   3,TRUE,TRUE,0) RETURNING id INTO a_paid_cap;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_capital, '312','الأرباح المبقاة',            'equity',   3,TRUE,TRUE,0) RETURNING id INTO a_ret_earn;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_capital, '313','أرباح العام الحالي',         'equity',   3,TRUE,TRUE,0) RETURNING id INTO a_curr_yr;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_sales_rev,'411','مبيعات البضائع',            'revenue',  3,TRUE,TRUE,0) RETURNING id INTO a_sales;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_sales_rev,'412','مردودات المبيعات',          'revenue',  3,TRUE,TRUE,0) RETURNING id INTO a_sales_ret;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_sell_exp, '511','تكلفة البضائع المباعة',     'expense',  3,TRUE,TRUE,0) RETURNING id INTO a_cogs;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_admin_exp,'521','الرواتب والأجور',           'expense',  3,TRUE,TRUE,0) RETURNING id INTO a_salaries;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_admin_exp,'522','الإيجارات',                 'expense',  3,TRUE,TRUE,0) RETURNING id INTO a_rent;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_admin_exp,'523','المرافق (كهرباء وماء)',      'expense',  3,TRUE,TRUE,0) RETURNING id INTO a_utilities;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_admin_exp,'524','تسويق وإعلان',              'expense',  3,TRUE,TRUE,0) RETURNING id INTO a_mkt;
INSERT INTO accounts(company_id,parent_id,code,name_ar,type,level,is_detail,is_active,balance) VALUES(v_cid,a_fin_exp,  '531','رسوم وعمولات بنكية',        'expense',  3,TRUE,TRUE,0) RETURNING id INTO a_bank_fees;

-- ══ قيود يومية تجريبية ═════════════════════════════════════

-- القيد 1: رأس المال الافتتاحي
v_entry := get_next_sequence(v_cid, 'journal');
INSERT INTO journal_entries(company_id,entry_number,entry_date,status,description,total_debit,total_credit,is_auto)
VALUES(v_cid,v_entry,'2026-01-01','posted','رأس المال الافتتاحي',500000,500000,FALSE) RETURNING id INTO j1;
INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES
  (j1,a_cash,   'صندوق افتتاحي',200000,0),
  (j1,a_bank_al,'رصيد بنكي افتتاحي',300000,0),
  (j1,a_paid_cap,'رأس المال المدفوع',0,500000);

-- القيد 2: شراء مخزون
v_entry := get_next_sequence(v_cid, 'journal');
INSERT INTO journal_entries(company_id,entry_number,entry_date,status,description,total_debit,total_credit,is_auto)
VALUES(v_cid,v_entry,'2026-05-01','posted','شراء بضائع من المراعي للألبان',2557.50,2557.50,FALSE) RETURNING id INTO j2;
INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES
  (j2,a_inv_acc,'مخزون منتجات ألبان',2400.00,0),
  (j2,a_vat_in, 'ضريبة المدخلات 15%',157.50,0),
  (j2,a_bank_al,'دفع بتحويل بنكي',0,2557.50);

-- القيد 3: فاتورة مبيعات نقدية
v_entry := get_next_sequence(v_cid, 'journal');
INSERT INTO journal_entries(company_id,entry_number,entry_date,status,description,total_debit,total_credit,is_auto)
VALUES(v_cid,v_entry,'2026-05-01','posted','فاتورة مبيعات INV-2026-0001 - مطعم البيت السعيد',397.63,397.63,FALSE) RETURNING id INTO j3;
INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES
  (j3,a_cash,   'إيرادات نقدية',397.63,0),
  (j3,a_sales,  'إيراد المبيعات',0,350.00),
  (j3,a_vat_out,'ضريبة المخرجات 15%',0,47.63);

-- القيد 4: فاتورة مبيعات آجلة
v_entry := get_next_sequence(v_cid, 'journal');
INSERT INTO journal_entries(company_id,entry_number,entry_date,status,description,total_debit,total_credit,is_auto)
VALUES(v_cid,v_entry,'2026-05-20','posted','فاتورة مبيعات INV-2026-0003 - فندق النخيل (آجل)',2187.50,2187.50,FALSE) RETURNING id INTO j4;
INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES
  (j4,a_ar,     'ذمم عميل - فندق النخيل',2187.50,0),
  (j4,a_sales,  'إيراد المبيعات',0,2000.00),
  (j4,a_vat_out,'ضريبة المخرجات 15%',0,187.50);

-- القيد 5: مصروفات الشهر
v_entry := get_next_sequence(v_cid, 'journal');
INSERT INTO journal_entries(company_id,entry_number,entry_date,status,description,total_debit,total_credit,is_auto)
VALUES(v_cid,v_entry,'2026-05-01','posted','مصروفات مايو 2026 - إيجار ورواتب',20000,20000,FALSE) RETURNING id INTO j5;
INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES
  (j5,a_rent,    'إيجار المحل مايو',8000,0),
  (j5,a_salaries,'رواتب موظفين مايو',12000,0),
  (j5,a_bank_al, 'دفع من البنك',0,20000);

-- تحديث أرصدة الحسابات
UPDATE accounts SET balance = 200000 - 397.63  WHERE id=a_cash;
UPDATE accounts SET balance = 300000 + 2400 - 2557.50 - 20000 WHERE id=a_bank_al;
UPDATE accounts SET balance = 2187.50           WHERE id=a_ar;
UPDATE accounts SET balance = 2400.00           WHERE id=a_inv_acc;
UPDATE accounts SET balance = 157.50            WHERE id=a_vat_in;
UPDATE accounts SET balance = 47.63 + 187.50   WHERE id=a_vat_out;
UPDATE accounts SET balance = 500000            WHERE id=a_paid_cap;
UPDATE accounts SET balance = 350.00 + 2000.00 WHERE id=a_sales;
UPDATE accounts SET balance = 2400.00           WHERE id=a_cogs;
UPDATE accounts SET balance = 8000             WHERE id=a_rent;
UPDATE accounts SET balance = 12000            WHERE id=a_salaries;

RAISE NOTICE '✅ تم إضافة % حساب + 5 قيود يومية', (SELECT COUNT(*) FROM accounts WHERE company_id=v_cid);

END $$;
