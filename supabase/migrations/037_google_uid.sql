-- 구글 로그인 계정 연결용 (이중가입 방지)
ALTER TABLE members ADD COLUMN IF NOT EXISTS google_uid UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_google_uid
  ON members(google_uid) WHERE google_uid IS NOT NULL;
