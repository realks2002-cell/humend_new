-- ============================================================
-- 033: 위치추적 → 알림 기반 출근확인 시스템 전환
-- 기존 10개 상태를 5개로 축소, 위치추적 컬럼 제거,
-- 알림 설정 컬럼 추가
-- ============================================================

-- =====================
-- 1. 기존 데이터 마이그레이션 (상태 정리)
-- =====================
UPDATE daily_shifts SET arrival_status = 'pending'
WHERE arrival_status IN ('tracking', 'moving', 'offline', 'no_signal', 'late_risk', 'noshow_risk');

UPDATE daily_shifts SET arrival_status = 'arrived'
WHERE arrival_status = 'late';

-- =====================
-- 2. 새 컬럼 추가 (DROP 전에 먼저 추가)
-- =====================
ALTER TABLE daily_shifts
  ADD COLUMN IF NOT EXISTS alert_minutes_before SMALLINT NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS alert_interval_minutes SMALLINT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS alert_max_count SMALLINT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS notification_sent_count SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nearby_at TIMESTAMPTZ;

-- =====================
-- 3. 위치추적 컬럼 제거
-- =====================
ALTER TABLE daily_shifts
  DROP COLUMN IF EXISTS last_known_lat,
  DROP COLUMN IF EXISTS last_known_lng,
  DROP COLUMN IF EXISTS last_seen_at,
  DROP COLUMN IF EXISTS last_speed,
  DROP COLUMN IF EXISTS location_consent,
  DROP COLUMN IF EXISTS tracking_started_at,
  DROP COLUMN IF EXISTS tracking_start_lat,
  DROP COLUMN IF EXISTS tracking_start_lng,
  DROP COLUMN IF EXISTS first_in_range_at,
  DROP COLUMN IF EXISTS left_site_at,
  DROP COLUMN IF EXISTS offsite_count,
  DROP COLUMN IF EXISTS last_heartbeat_at,
  DROP COLUMN IF EXISTS last_alert_at,
  DROP COLUMN IF EXISTS risk_level;

-- =====================
-- 4. arrival_status CHECK 제약 변경 (10개 → 5개)
-- =====================
ALTER TABLE daily_shifts DROP CONSTRAINT IF EXISTS daily_shifts_arrival_status_check;
ALTER TABLE daily_shifts ADD CONSTRAINT daily_shifts_arrival_status_check
  CHECK (arrival_status IN ('pending', 'notified', 'confirmed', 'arrived', 'noshow'));

-- =====================
-- 5. 위치추적 관련 테이블 제거
-- =====================

-- work_location_logs Realtime 해제 (있으면)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'work_location_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE work_location_logs;
  END IF;
END $$;

DROP TABLE IF EXISTS work_location_logs CASCADE;

-- =====================
-- 6. 위치추적 관련 함수 제거
-- =====================
DROP FUNCTION IF EXISTS check_arrival_distance(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS detect_noshow_risk(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS calculate_eta(UUID);

-- =====================
-- 7. cleanup_old_data() 함수 재정의 (location_logs 참조 제거)
-- =====================
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_6m TIMESTAMPTZ := now() - INTERVAL '6 months';
  cutoff_3y TIMESTAMPTZ := now() - INTERVAL '3 years';
  cnt BIGINT;
BEGIN
  -- 1. notification_logs (6개월)
  DELETE FROM notification_logs WHERE created_at < cutoff_6m;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'notification_logs'; deleted_count := cnt;
  RETURN NEXT;

  -- 2. daily_shifts (6개월)
  DELETE FROM daily_shifts WHERE work_date < (cutoff_6m::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'daily_shifts'; deleted_count := cnt;
  RETURN NEXT;

  -- 3. payments (3년)
  DELETE FROM payments WHERE work_date < (cutoff_3y::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'payments'; deleted_count := cnt;
  RETURN NEXT;

  -- 4. work_records (3년)
  DELETE FROM work_records WHERE work_date < (cutoff_3y::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'work_records'; deleted_count := cnt;
  RETURN NEXT;
END;
$$;

-- =====================
-- 8. members 테이블의 위치 동의 컬럼은 유지
-- (Google Play 심사용으로 여전히 필요할 수 있음)
-- =====================
