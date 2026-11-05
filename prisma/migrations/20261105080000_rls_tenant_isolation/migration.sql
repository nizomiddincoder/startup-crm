-- PostgreSQL Row Level Security: kompaniya (tenant) izolyatsiyasi bazaviy darajada.
-- Prisma odatiy ulanishi jadval egasi bo'lgani uchun RLS'dan tashqarida qoladi (eski oqimlar buzilmaydi).
-- `withTenant()` (lib/db-tenant.ts) tranzaksiya ichida `SET LOCAL ROLE kassa_app` +
-- `set_config('app.tenant_id', ...)` qiladi — shu yo'lda RLS majburiy tekshiriladi.

-- kassa_app — login qilmaydigan rol; faqat SET LOCAL ROLE orqali ishlatiladi.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kassa_app') THEN
    CREATE ROLE kassa_app NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO kassa_app;
-- Migratsiyani bajarayotgan foydalanuvchi (DATABASE_URL egasi) SET ROLE qila olsin.
GRANT kassa_app TO CURRENT_USER;

-- tenantId bor barcha biznes jadvallariga siyosat: qator faqat sessiyadagi
-- app.tenant_id ga teng bo'lsa ko'rinadi/yoziladi. Sozlanmagan bo'lsa — HECH NARSA ko'rinmaydi.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'Category', 'Product', 'Sale', 'SaleItem', 'SalePayment', 'StockMovement',
    'Estimate', 'EstimateItem', 'StockDocument', 'StockDocumentItem', 'Customer',
    'LedgerEntry', 'TelegramLinkCode', 'TelegramDispatch', 'ReminderLog',
    'SaleReturn', 'SaleReturnItem', 'CashShift', 'CustomerVerification',
    'ProductImage', 'AiGeneration', 'Promotion', 'Order',
    'Branch', 'Membership', 'StaffInvite', 'StaffDevice', 'MiniAppToken',
    'ModuleRequest', 'Payment', 'StockTransfer', 'StockTransferItem'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    IF t = 'Tenant' THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I USING (id::text = current_setting(''app.tenant_id'', true)) WITH CHECK (id::text = current_setting(''app.tenant_id'', true))',
        t);
    ELSE
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I USING ("tenantId"::text = current_setting(''app.tenant_id'', true)) WITH CHECK ("tenantId"::text = current_setting(''app.tenant_id'', true))',
        t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kassa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kassa_app;
