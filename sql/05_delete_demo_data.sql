-- ============================================================
-- الملف الخامس: حذف البيانات التجريبية
-- شغّل فقط إذا أردت حذف بيانات الاختبار
-- ============================================================

DO $$
DECLARE v_cid UUID;
BEGIN
  SELECT id INTO v_cid FROM companies WHERE name_ar ILIKE '%صحاري%' LIMIT 1;
  IF v_cid IS NULL THEN RAISE EXCEPTION 'الشركة غير موجودة'; END IF;

  DELETE FROM notifications        WHERE company_id = v_cid;
  DELETE FROM invoice_items        WHERE invoice_id  IN (SELECT id FROM invoices  WHERE company_id = v_cid);
  DELETE FROM purchase_items       WHERE purchase_id IN (SELECT id FROM purchases WHERE company_id = v_cid);
  DELETE FROM invoices             WHERE company_id = v_cid;
  DELETE FROM purchases            WHERE company_id = v_cid;
  DELETE FROM expenses             WHERE company_id = v_cid;
  DELETE FROM inventory_movements  WHERE company_id = v_cid;
  DELETE FROM inventory            WHERE warehouse_id IN (SELECT id FROM warehouses WHERE company_id = v_cid);
  DELETE FROM products             WHERE company_id = v_cid;
  DELETE FROM categories           WHERE company_id = v_cid;
  DELETE FROM customers            WHERE company_id = v_cid;
  DELETE FROM suppliers            WHERE company_id = v_cid;

  RAISE NOTICE '✅ تم حذف البيانات التجريبية';
END $$;
