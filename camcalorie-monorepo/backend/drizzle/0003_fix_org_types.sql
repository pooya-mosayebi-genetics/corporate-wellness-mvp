-- ─────────────────────────────────────────────────────────────
-- Migration اصلاحی: تبدیل کامل org.id و personnel.organization_id به text
-- ─────────────────────────────────────────────────────────────

-- ۱) حذف Foreign Key فعلی (چون مانع تغییر نوع می‌شود)
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS personnel_organization_id_organizations_id_fk;

-- ۲) تغییر نوع organizations.id به text
ALTER TABLE organizations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE organizations ALTER COLUMN id TYPE text USING id::text;

-- ۳) تغییر نوع personnel.organization_id به text
ALTER TABLE personnel ALTER COLUMN organization_id TYPE text USING organization_id::text;
ALTER TABLE personnel ALTER COLUMN organization_id DROP DEFAULT;

-- ۴) اضافه کردن ستون‌های گمشده در organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name_fa text;

-- ۵) اضافه کردن دوباره Foreign Key (حالا هر دو ستون text هستند)
ALTER TABLE personnel ADD CONSTRAINT personnel_organization_id_organizations_id_fk
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- ۶) ایندکس‌های اضافی برای organizations
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations (name);

-- ۷) ایجاد سازمان پیش‌فرض 'org-saman' (حالا که id text است)
INSERT INTO organizations (id, name, name_fa, code, is_active, created_at, updated_at)
VALUES ('org-saman', 'Saman Bank', 'بانک سامان', 'SAMAN', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_fa = EXCLUDED.name_fa,
  code = EXCLUDED.code,
  updated_at = NOW();

-- ۸) به‌روزرسانی رکوردهای موجود personnel که organization_id دارند
UPDATE personnel SET organization_id = 'org-saman' WHERE organization_id IS NULL;