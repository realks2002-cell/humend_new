-- 회원 권한 / 배터리 최적화 상태 자동 진단
-- Silent Push로 앱이 보고한 권한 상태를 저장

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS location_permission TEXT,
  ADD COLUMN IF NOT EXISTS battery_optimized BOOLEAN,
  ADD COLUMN IF NOT EXISTS last_permission_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS platform TEXT;

COMMENT ON COLUMN members.location_permission IS 'always | whenInUse | denied | notDetermined | unknown';
COMMENT ON COLUMN members.battery_optimized IS 'Android 배터리 최적화 예외 등록 여부 (iOS는 NULL)';
COMMENT ON COLUMN members.last_permission_check IS 'Silent Push로 보고받은 마지막 시각';
COMMENT ON COLUMN members.platform IS 'ios | android';
