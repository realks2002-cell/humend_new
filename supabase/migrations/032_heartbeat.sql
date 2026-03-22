-- last_heartbeat_at 컬럼 추가 + arrival_status에 'no_signal' 추가
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

ALTER TABLE daily_shifts DROP CONSTRAINT IF EXISTS daily_shifts_arrival_status_check;
ALTER TABLE daily_shifts ADD CONSTRAINT daily_shifts_arrival_status_check
  CHECK (arrival_status IN (
    'pending','tracking','moving','offline','no_signal','late_risk',
    'noshow_risk','arrived','late','noshow'
  ));
