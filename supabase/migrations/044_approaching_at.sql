-- 5km 접근 감지 시각 컬럼 추가
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS approaching_at TIMESTAMPTZ;
