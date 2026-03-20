-- ============================================================
-- 030: detect_noshow_risk() hour_movement 복원
-- 022에서 tracking_start ↔ last_known 거리로 변경된 hour_movement를
-- work_location_logs(026) 기반 "최근 위치 vs 50분 전 위치" 비교로 복원
-- ============================================================

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
      -- 최근 1시간 이동 거리 (work_location_logs 기반)
      (
        SELECT COALESCE(
          ST_Distance(
            ST_SetSRID(ST_MakePoint(l1.lng, l1.lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(l2.lng, l2.lat), 4326)::geography
          ), 0
        )
        FROM (
          SELECT lat, lng FROM work_location_logs
          WHERE shift_id = sc.s_id ORDER BY recorded_at DESC LIMIT 1
        ) l1,
        (
          SELECT lat, lng FROM work_location_logs
          WHERE shift_id = sc.s_id
            AND recorded_at < check_time - INTERVAL '50 minutes'
          ORDER BY recorded_at DESC LIMIT 1
        ) l2
      ) AS hour_movement
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
