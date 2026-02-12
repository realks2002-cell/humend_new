-- ============================================
-- Humend HR - 이메일 컬럼 추가
-- ============================================

ALTER TABLE members
ADD COLUMN IF NOT EXISTS email varchar(255);

COMMENT ON COLUMN members.email IS '회원 이메일 주소';
