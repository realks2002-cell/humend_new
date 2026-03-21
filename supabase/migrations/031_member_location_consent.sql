-- members 테이블에 위치 수집 동의 컬럼 추가 (1회 동의, Google Play 심사 대응)
ALTER TABLE members ADD COLUMN IF NOT EXISTS location_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;

-- location_logs 보관 기간을 90일로 변경 (개인정보처리방침과 일치)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_6m TIMESTAMPTZ := now() - INTERVAL '6 months';
  cutoff_90d TIMESTAMPTZ := now() - INTERVAL '90 days';
  cnt BIGINT;
BEGIN
  -- 1. location_logs (90일 — 개인정보처리방침 기준)
  DELETE FROM location_logs WHERE recorded_at < cutoff_90d;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'location_logs'; deleted_count := cnt;
  RETURN NEXT;

  -- 2. notification_logs (6개월)
  DELETE FROM notification_logs WHERE created_at < cutoff_6m;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'notification_logs'; deleted_count := cnt;
  RETURN NEXT;

  -- 3. daily_shifts (6개월)
  DELETE FROM daily_shifts WHERE work_date < (cutoff_6m::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'daily_shifts'; deleted_count := cnt;
  RETURN NEXT;

  -- 4. payments (6개월)
  DELETE FROM payments WHERE work_date < (cutoff_6m::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'payments'; deleted_count := cnt;
  RETURN NEXT;

  -- 5. work_records (6개월)
  DELETE FROM work_records WHERE work_date < (cutoff_6m::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'work_records'; deleted_count := cnt;
  RETURN NEXT;
END;
$$;
