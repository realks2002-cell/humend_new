-- SMS 인증 용도 구분: 회원가입(signup) / 비밀번호 재설정(reset)
-- 기존 행과 reserve_phone_verification이 만드는 행은 기본값 'signup'. reset은 send API가 예약 직후 갱신한다.
-- 주의: 이 마이그레이션을 먼저 적용한 뒤 코드를 배포해야 한다 (isPhoneVerified가 purpose 컬럼을 조회).

ALTER TABLE phone_verifications
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'signup';

ALTER TABLE phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_purpose_check;
ALTER TABLE phone_verifications
  ADD CONSTRAINT phone_verifications_purpose_check CHECK (purpose IN ('signup', 'reset'));
