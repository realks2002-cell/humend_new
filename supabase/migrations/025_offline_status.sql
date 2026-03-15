-- arrival_status에 'offline' 추가
ALTER TABLE daily_shifts DROP CONSTRAINT IF EXISTS daily_shifts_arrival_status_check;
ALTER TABLE daily_shifts ADD CONSTRAINT daily_shifts_arrival_status_check
  CHECK (arrival_status IN (
    'pending','tracking','moving','offline','late_risk',
    'noshow_risk','arrived','late','noshow'
  ));
