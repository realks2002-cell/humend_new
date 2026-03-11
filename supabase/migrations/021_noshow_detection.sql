-- ============================================================
-- 021: 노쇼/지각 사전 판별 PostgreSQL 함수
-- ============================================================

-- 1. 노쇼 위험 감지 함수
-- 3단계 판별:
--   1단계(🟡): 출근 2시간 전, 위치 데이터 없음 (앱 미실행)
--   2단계(🟠): 출근 1시간 전, 최근 1시간 이동 500m 미만
--   3단계(🔴): 출근 30분 전, 미이동 + 근무지 3km 초과
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
  kst_time TIMESTAMPTZ := check_time AT TIME ZONE 'Asia/Seoul';
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
      -- 출근까지 남은 분
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
      -- 현재 거리 계산
      CASE
        WHEN sc.last_known_lat IS NOT NULL AND sc.c_lat IS NOT NULL THEN
          ST_Distance(
            ST_SetSRID(ST_MakePoint(sc.last_known_lng, sc.last_known_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(sc.c_lng, sc.c_lat), 4326)::geography
          )
        ELSE NULL
      END AS dist_meters,
      -- 최근 1시간 이동 거리
      (
        SELECT COALESCE(
          ST_Distance(
            ST_SetSRID(ST_MakePoint(l1.lng, l1.lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(l2.lng, l2.lat), 4326)::geography
          ), 0
        )
        FROM (
          SELECT lat, lng FROM location_logs
          WHERE shift_id = sc.s_id
          ORDER BY recorded_at DESC LIMIT 1
        ) l1,
        (
          SELECT lat, lng FROM location_logs
          WHERE shift_id = sc.s_id
            AND recorded_at < check_time - INTERVAL '50 minutes'
          ORDER BY recorded_at DESC LIMIT 1
        ) l2
      ) AS hour_movement
    FROM shift_candidates sc
    WHERE sc.minutes_until_start > 0  -- 출근 시간 전만
      AND sc.minutes_until_start <= 120  -- 2시간 이내만
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
      -- 3단계: 30분 전, 미이동 + 3km 초과
      WHEN rc.minutes_until_start <= 30
        AND (rc.hour_movement IS NULL OR rc.hour_movement < 500)
        AND (rc.dist_meters IS NULL OR rc.dist_meters > 3000)
      THEN 3::SMALLINT

      -- 2단계: 1시간 전, 1시간 이동 500m 미만
      WHEN rc.minutes_until_start <= 60
        AND (rc.hour_movement IS NULL OR rc.hour_movement < 500)
      THEN 2::SMALLINT

      -- 1단계: 2시간 전, 위치 데이터 없음
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

-- 2. ETA 계산 함수 (직선거리 기반)
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
  -- 최신 위치
  SELECT ds.last_known_lat, ds.last_known_lng, c.latitude, c.longitude
  INTO v_lat, v_lng, v_c_lat, v_c_lng
  FROM daily_shifts ds
  JOIN clients c ON c.id = ds.client_id
  WHERE ds.id = p_shift_id;

  IF v_lat IS NULL OR v_c_lat IS NULL THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::DOUBLE PRECISION, NULL::DOUBLE PRECISION;
    RETURN;
  END IF;

  -- 거리 계산
  v_dist := ST_Distance(
    ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(v_c_lng, v_c_lat), 4326)::geography
  );

  -- 최근 5개 로그의 평균 속도 (m/s)
  SELECT COALESCE(AVG(NULLIF(speed, 0)), 1.4) -- 기본 도보 속도 5km/h
  INTO v_speed
  FROM (
    SELECT speed FROM location_logs
    WHERE shift_id = p_shift_id AND speed > 0
    ORDER BY recorded_at DESC LIMIT 5
  ) sub;

  -- ETA = 거리/속도(초) → 분 + 마진 10분
  RETURN QUERY SELECT
    CEIL(v_dist / v_speed / 60 + 10)::INTEGER,
    v_dist,
    v_speed;
END;
$$;

-- 3. 90일 이상 위치 로그 정리
CREATE OR REPLACE FUNCTION cleanup_old_location_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM location_logs
  WHERE recorded_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
