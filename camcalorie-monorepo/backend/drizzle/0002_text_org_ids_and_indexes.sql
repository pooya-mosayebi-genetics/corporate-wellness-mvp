-- ─────────────────────────────────────────────────────────────
-- Migration: تبدیل org.id به text + ایندکس‌های مقیاس‌پذیری
-- ─────────────────────────────────────────────────────────────

-- ۱) تغییر نوع ستون‌های org به text (برای سازگاری با 'org-saman' و ...)
ALTER TABLE organizations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE organizations ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE personnel ALTER COLUMN organization_id TYPE text USING organization_id::text;
ALTER TABLE personnel ALTER COLUMN organization_id DROP DEFAULT;

-- ۲) ایندکس‌های جستجوی سریع (برای ۲۰۰۰+ رکورد)
CREATE INDEX IF NOT EXISTS idx_personnel_full_name ON personnel (full_name);
CREATE INDEX IF NOT EXISTS idx_personnel_mobile ON personnel (mobile) WHERE mobile IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personnel_org ON personnel (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personnel_created_at ON personnel (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personnel_gender ON personnel (gender) WHERE gender IS NOT NULL;

-- ۳) ایندکس‌های users
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_login_failures ON users (login_failures) WHERE login_failures > 0;

-- ۴) ایندکس‌های organizations
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations (is_active) WHERE is_active = true;

-- ۵) ایجاد سازمان پیش‌فرض اگر وجود ندارد
INSERT INTO organizations (id, name, name_fa, is_active, created_at, updated_at)
VALUES ('org-saman', 'Saman Bank', 'بانک سامان', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;