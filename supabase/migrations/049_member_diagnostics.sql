-- 회원 진단 정보 확장 (디바이스, GPS, 위치서비스, 활성 시각)
-- 048에 이어 더 풍부한 진단을 위한 컬럼 추가

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS last_gps_accuracy NUMERIC,
  ADD COLUMN IF NOT EXISTS last_gps_success BOOLEAN,
  ADD COLUMN IF NOT EXISTS location_services_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS device_model TEXT,
  ADD COLUMN IF NOT EXISTS os_version TEXT,
  ADD COLUMN IF NOT EXISTS disk_free_mb INTEGER;

COMMENT ON COLUMN members.last_gps_accuracy IS 'GPS 측정 정확도 미터 (낮을수록 좋음, 100m 이하면 정상)';
COMMENT ON COLUMN members.last_gps_success IS 'GPS 측정 성공 여부 (false = 타임아웃 또는 GPS OFF)';
COMMENT ON COLUMN members.location_services_enabled IS '폰 자체 위치 서비스 활성화 여부';
COMMENT ON COLUMN members.last_active_at IS '앱 마지막 실행 시각 (활성 회원 추적)';
COMMENT ON COLUMN members.device_manufacturer IS 'Samsung / Apple / Xiaomi 등';
COMMENT ON COLUMN members.device_model IS 'iPhone12,1 / SM-S908N 등';
COMMENT ON COLUMN members.os_version IS '14.0 / 18.7.8 등';
COMMENT ON COLUMN members.disk_free_mb IS '저장공간 여유 (MB) — 1GB 이하면 강제종료 위험';
