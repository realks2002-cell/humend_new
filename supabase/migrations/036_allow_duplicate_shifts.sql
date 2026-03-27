-- 같은 날 같은 회원 중복 배정 허용
DROP INDEX IF EXISTS idx_daily_shifts_member_date;

-- 대신 일반 인덱스로 대체 (조회 성능 유지)
CREATE INDEX IF NOT EXISTS idx_daily_shifts_member_date
  ON daily_shifts (member_id, work_date);
