-- 근무 중 위치추적 + 이탈 기록
-- daily_shifts에 이탈 관련 컬럼 추가
ALTER TABLE daily_shifts
  ADD COLUMN IF NOT EXISTS left_site_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offsite_count SMALLINT DEFAULT 0;

-- 근무 중 위치 로그 테이블
CREATE TABLE IF NOT EXISTS work_location_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES daily_shifts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  distance_meters DOUBLE PRECISION,
  is_offsite BOOLEAN DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_location_logs_shift_recorded
  ON work_location_logs (shift_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_location_logs_member
  ON work_location_logs (member_id);

-- RLS
ALTER TABLE work_location_logs ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 INSERT/SELECT
CREATE POLICY "members_insert_own_work_location_logs"
  ON work_location_logs FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "members_select_own_work_location_logs"
  ON work_location_logs FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

-- 관리자: 전체 접근
CREATE POLICY "admins_all_work_location_logs"
  ON work_location_logs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
