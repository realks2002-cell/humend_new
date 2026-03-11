-- ============================================================
-- 020: 위치추적 + 노쇼/지각 판별 기반 테이블
-- ============================================================

-- 1. PostGIS extension (좌표 거리 계산)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. daily_shifts: 일일 근무 배정 + 추적 상태
CREATE TABLE IF NOT EXISTS daily_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- 도착 상태
  arrival_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (arrival_status IN (
      'pending','tracking','moving','late_risk',
      'noshow_risk','arrived','late','noshow'
    )),
  risk_level SMALLINT NOT NULL DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 3),
  arrived_at TIMESTAMPTZ,

  -- 최신 위치 캐시 (매번 location_logs 조회 방지)
  last_known_lat DOUBLE PRECISION,
  last_known_lng DOUBLE PRECISION,
  last_seen_at TIMESTAMPTZ,

  -- 위치 수집 동의 + 추적 시작 시각
  location_consent BOOLEAN NOT NULL DEFAULT false,
  tracking_started_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 동일 회원 동일 날짜 중복 배정 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_shifts_member_date
  ON daily_shifts (member_id, work_date);

-- 날짜별 조회 (관리자 대시보드)
CREATE INDEX IF NOT EXISTS idx_daily_shifts_work_date
  ON daily_shifts (work_date);

-- 고객사별 + 날짜 조회
CREATE INDEX IF NOT EXISTS idx_daily_shifts_client_date
  ON daily_shifts (client_id, work_date);

-- 상태 필터링
CREATE INDEX IF NOT EXISTS idx_daily_shifts_status
  ON daily_shifts (arrival_status);

-- updated_at 트리거 (기존 함수 재사용)
CREATE TRIGGER set_daily_shifts_updated_at
  BEFORE UPDATE ON daily_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 3. location_logs: 위치 이력
CREATE TABLE IF NOT EXISTS location_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES daily_shifts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- shift별 시간순 조회
CREATE INDEX IF NOT EXISTS idx_location_logs_shift_time
  ON location_logs (shift_id, recorded_at DESC);

-- member별 조회
CREATE INDEX IF NOT EXISTS idx_location_logs_member
  ON location_logs (member_id, recorded_at DESC);

-- 4. RLS 정책

ALTER TABLE daily_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;

-- daily_shifts: 회원은 본인만 조회
CREATE POLICY daily_shifts_member_select ON daily_shifts
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- daily_shifts: 회원은 본인 동의/추적 상태만 수정
CREATE POLICY daily_shifts_member_update ON daily_shifts
  FOR UPDATE TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

-- daily_shifts: 관리자 전체 접근
CREATE POLICY daily_shifts_admin_all ON daily_shifts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- location_logs: 회원은 본인 INSERT만
CREATE POLICY location_logs_member_insert ON location_logs
  FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid());

-- location_logs: 회원은 본인 조회
CREATE POLICY location_logs_member_select ON location_logs
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- location_logs: 관리자 전체 접근
CREATE POLICY location_logs_admin_all ON location_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- 5. PostGIS 도착 판별 함수
CREATE OR REPLACE FUNCTION check_arrival_distance(
  p_shift_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius DOUBLE PRECISION DEFAULT 250
)
RETURNS TABLE (
  is_arrived BOOLEAN,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_lat DOUBLE PRECISION;
  v_client_lng DOUBLE PRECISION;
  v_distance DOUBLE PRECISION;
BEGIN
  -- shift에 연결된 고객사 좌표 조회
  SELECT c.latitude, c.longitude
  INTO v_client_lat, v_client_lng
  FROM daily_shifts ds
  JOIN clients c ON c.id = ds.client_id
  WHERE ds.id = p_shift_id;

  IF v_client_lat IS NULL OR v_client_lng IS NULL THEN
    RETURN QUERY SELECT false, NULL::DOUBLE PRECISION;
    RETURN;
  END IF;

  -- PostGIS ST_Distance (미터 단위, geography 타입)
  v_distance := ST_Distance(
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(v_client_lng, v_client_lat), 4326)::geography
  );

  RETURN QUERY SELECT (v_distance <= p_radius), v_distance;
END;
$$;

-- 6. Supabase Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE daily_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE location_logs;
