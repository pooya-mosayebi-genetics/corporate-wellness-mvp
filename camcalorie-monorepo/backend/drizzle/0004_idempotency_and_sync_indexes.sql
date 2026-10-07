-- ─────────────────────────────────────────────────────────────
-- Gap ۱: کلید idempotency + ایندکس‌های sync برای meals و body_analyses
-- ─────────────────────────────────────────────────────────────

ALTER TABLE meals ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS meals_idempotency_key_unique
  ON meals (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE body_analyses ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS body_analyses_idempotency_key_unique
  ON body_analyses (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ایندکس‌های خواندن سریع «دادهٔ خود کاربر»
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_body_analyses_nid_date ON body_analyses (national_id, analyzed_at DESC);

-- Gap ۲: ستون soft-delete برای حذف امن (بدون از دست رفتن audit)
ALTER TABLE meals ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_meals_user_alive ON meals (user_id, deleted_at, date DESC);