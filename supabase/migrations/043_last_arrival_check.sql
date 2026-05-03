ALTER TABLE daily_shifts
ADD COLUMN IF NOT EXISTS last_arrival_check_at TIMESTAMPTZ;
