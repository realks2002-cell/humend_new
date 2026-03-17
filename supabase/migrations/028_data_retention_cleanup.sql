-- 6개월 지난 데이터 자동 삭제 (DB 용량 관리)
-- 대상: daily_shifts, work_records, payments, location_logs, notification_logs

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE(table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff TIMESTAMPTZ := now() - INTERVAL '6 months';
  cnt BIGINT;
BEGIN
  -- 1. location_logs (기존 90일 → 6개월로 통합)
  DELETE FROM location_logs WHERE recorded_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'location_logs'; deleted_count := cnt;
  RETURN NEXT;

  -- 2. notification_logs
  DELETE FROM notification_logs WHERE created_at < cutoff;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'notification_logs'; deleted_count := cnt;
  RETURN NEXT;

  -- 3. daily_shifts
  DELETE FROM daily_shifts WHERE work_date < (cutoff::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'daily_shifts'; deleted_count := cnt;
  RETURN NEXT;

  -- 4. payments (확정 급여 - 6개월 지난 것)
  DELETE FROM payments WHERE work_date < (cutoff::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'payments'; deleted_count := cnt;
  RETURN NEXT;

  -- 5. work_records
  DELETE FROM work_records WHERE work_date < (cutoff::date);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  table_name := 'work_records'; deleted_count := cnt;
  RETURN NEXT;
END;
$$;

-- pg_cron 스케줄 등록
-- Supabase Dashboard > Database > Extensions에서 pg_cron 활성화 후
-- SQL Editor에서 아래 실행:
--
--   SELECT cron.schedule(
--     'cleanup-old-data',
--     '0 18 * * *',  -- UTC 18:00 = KST 03:00
--     'SELECT * FROM cleanup_old_data()'
--   );
