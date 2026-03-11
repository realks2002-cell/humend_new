-- ============================================================
-- 022: location_logs 제거 + daily_shifts 캐시 컬럼 추가
-- ============================================================

-- 1. daily_shifts에 캐시 컬럼 추가
ALTER TABLE daily_shifts
  ADD COLUMN IF NOT EXISTS first_in_range_at TIMESTAMPTZ,        -- 최초 250m 진입 시각
  ADD COLUMN IF NOT EXISTS tracking_start_lat DOUBLE PRECISION,  -- 추적 시작 위치
  ADD COLUMN IF NOT EXISTS tracking_start_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_speed DOUBLE PRECISION;          -- 최근 속도 (m/s)

-- 2. Realtime publication에서 location_logs 제거
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'location_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE location_logs;
  END IF;
END $$;

-- 3. cleanup 함수 DROP
DROP FUNCTION IF EXISTS cleanup_old_location_logs();

-- 4. detect_noshow_risk() 재정의 — location_logs 대신 daily_shifts 캐시 사용
CREATE OR REPLACE FUNCTION detect_noshow_risk(check_time TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (
  shift_id UUID,
  member_id UUID,
  client_id UUID,
  member_name TEXT,
  member_phone TEXT,
  company_name TEXT,
  start_time TIME,
  new_risk_level SMALLINT,
  distance_meters DOUBLE PRECISION,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := (check_time AT TIME ZONE 'Asia/Seoul')::DATE;
BEGIN
  RETURN QUERY
  WITH shift_candidates AS (
    SELECT
      ds.id AS s_id,
      ds.member_id AS s_member_id,
      ds.client_id AS s_client_id,
      ds.start_time AS s_start_time,
      ds.arrival_status,
      ds.risk_level AS current_risk,
      ds.last_known_lat,
      ds.last_known_lng,
      ds.last_seen_at AS s_last_seen,
      ds.tracking_start_lat,
      ds.tracking_start_lng,
      c.latitude AS c_lat,
      c.longitude AS c_lng,
      c.company_name AS c_name,
      m.name AS m_name,
      m.phone AS m_phone,
      EXTRACT(EPOCH FROM (
        (today + ds.start_time) AT TIME ZONE 'Asia/Seoul' - check_time
      )) / 60 AS minutes_until_start
    FROM daily_shifts ds
    JOIN clients c ON c.id = ds.client_id
    JOIN members m ON m.id = ds.member_id
    WHERE ds.work_date = today
      AND ds.arrival_status NOT IN ('arrived', 'late', 'noshow')
  ),
  risk_calc AS (
    SELECT
      sc.*,
      -- 현재 거리 (근무지까지)
      CASE
        WHEN sc.last_known_lat IS NOT NULL AND sc.c_lat IS NOT NULL THEN
          ST_Distance(
            ST_SetSRID(ST_MakePoint(sc.last_known_lng, sc.last_known_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(sc.c_lng, sc.c_lat), 4326)::geography
          )
        ELSE NULL
      END AS dist_meters,
      -- 추적 시작점 대비 이동 거리 (location_logs 대체)
      CASE
        WHEN sc.tracking_start_lat IS NOT NULL AND sc.last_known_lat IS NOT NULL THEN
          ST_Distance(
            ST_SetSRID(ST_MakePoint(sc.tracking_start_lng, sc.tracking_start_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(sc.last_known_lng, sc.last_known_lat), 4326)::geography
          )
        ELSE NULL
      END AS hour_movement
    FROM shift_candidates sc
    WHERE sc.minutes_until_start > 0
      AND sc.minutes_until_start <= 120
  )
  SELECT
    rc.s_id,
    rc.s_member_id,
    rc.s_client_id,
    rc.m_name,
    rc.m_phone,
    rc.c_name,
    rc.s_start_time,
    CASE
      WHEN rc.minutes_until_start <= 30
        AND (rc.hour_movement IS NULL OR rc.hour_movement < 500)
        AND (rc.dist_meters IS NULL OR rc.dist_meters > 3000)
      THEN 3::SMALLINT
      WHEN rc.minutes_until_start <= 60
        AND (rc.hour_movement IS NULL OR rc.hour_movement < 500)
      THEN 2::SMALLINT
      WHEN rc.minutes_until_start <= 120
        AND rc.last_known_lat IS NULL
      THEN 1::SMALLINT
      ELSE 0::SMALLINT
    END AS new_risk_level,
    rc.dist_meters,
    rc.s_last_seen
  FROM risk_calc rc
  WHERE CASE
    WHEN rc.minutes_until_start <= 30
      AND (rc.hour_movement IS NULL OR rc.hour_movement < 500)
      AND (rc.dist_meters IS NULL OR rc.dist_meters > 3000)
    THEN true
    WHEN rc.minutes_until_start <= 60
      AND (rc.hour_movement IS NULL OR rc.hour_movement < 500)
    THEN true
    WHEN rc.minutes_until_start <= 120
      AND rc.last_known_lat IS NULL
    THEN true
    ELSE false
  END;
END;
$$;

-- 5. calculate_eta() 재정의 — daily_shifts.last_speed 사용
CREATE OR REPLACE FUNCTION calculate_eta(p_shift_id UUID)
RETURNS TABLE (
  eta_minutes INTEGER,
  distance_meters DOUBLE PRECISION,
  avg_speed_mps DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_c_lat DOUBLE PRECISION;
  v_c_lng DOUBLE PRECISION;
  v_dist DOUBLE PRECISION;
  v_speed DOUBLE PRECISION;
BEGIN
  SELECT ds.last_known_lat, ds.last_known_lng, c.latitude, c.longitude,
         COALESCE(NULLIF(ds.last_speed, 0), 1.4)
  INTO v_lat, v_lng, v_c_lat, v_c_lng, v_speed
  FROM daily_shifts ds
  JOIN clients c ON c.id = ds.client_id
  WHERE ds.id = p_shift_id;

  IF v_lat IS NULL OR v_c_lat IS NULL THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::DOUBLE PRECISION, NULL::DOUBLE PRECISION;
    RETURN;
  END IF;

  v_dist := ST_Distance(
    ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(v_c_lng, v_c_lat), 4326)::geography
  );

  RETURN QUERY SELECT
    CEIL(v_dist / v_speed / 60 + 10)::INTEGER,
    v_dist,
    v_speed;
END;
$$;

-- 6. location_logs 테이블 DROP
DROP TABLE IF EXISTS location_logs CASCADE;
