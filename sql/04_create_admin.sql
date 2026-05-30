-- ============================================================
-- إعداد المدير — شغّل في Supabase SQL Editor
-- ============================================================

-- الخطوة 1: تأكيد البريد
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'aboaysel2710@gmail.com';

-- الخطوة 2: تحقق من وجود المستخدم
DO $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'aboaysel2710@gmail.com' LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION '❌ المستخدم غير موجود. اذهب إلى Authentication → Users → Add user وأنشئه أولاً، ثم شغّل هذا الملف مرة أخرى.';
  END IF;

  -- حذف بيانات الشركة القديمة لو موجودة
  DELETE FROM users    WHERE id = v_uid;
  DELETE FROM companies WHERE id IN (SELECT company_id FROM users WHERE id = v_uid);

  -- إنشاء الشركة والمدير
  PERFORM register_company(
    v_uid,
    'أسواق صحاري للمواد الغذائية',
    'مصطفى عبده',
    '0555006855'
  );

  RAISE NOTICE '✅ تم الإعداد بنجاح — UUID: %', v_uid;
END $$;
