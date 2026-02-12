-- ============================================
-- 신원인증 + 키 + 개인정보동의 컬럼 추가 (members 테이블)
-- ============================================

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS rrn_front varchar(6),
  ADD COLUMN IF NOT EXISTS rrn_back varchar(7),
  ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS height smallint,
  ADD COLUMN IF NOT EXISTS privacy_agreed boolean DEFAULT false;
