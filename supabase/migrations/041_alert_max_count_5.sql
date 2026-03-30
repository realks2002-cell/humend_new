-- 출근 알림 최대 횟수 기본값 3 → 5로 변경
ALTER TABLE daily_shifts ALTER COLUMN alert_max_count SET DEFAULT 5;

-- 기존 데이터도 5로 업데이트 (아직 3인 것들)
UPDATE daily_shifts SET alert_max_count = 5 WHERE alert_max_count = 3;
