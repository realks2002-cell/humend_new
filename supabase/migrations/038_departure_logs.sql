-- 근무 이탈 기록 테이블
CREATE TABLE IF NOT EXISTS departure_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES daily_shifts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  departed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  departed_lat DOUBLE PRECISION,
  departed_lng DOUBLE PRECISION,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_departure_logs_shift ON departure_logs(shift_id);
CREATE INDEX idx_departure_logs_member_date ON departure_logs(member_id, departed_at);

-- RLS
ALTER TABLE departure_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own departure logs"
  ON departure_logs FOR SELECT
  USING (member_id = auth.uid());

CREATE POLICY "Admins full access to departure logs"
  ON departure_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY "Service role full access to departure logs"
  ON departure_logs FOR ALL
  USING (auth.role() = 'service_role');
