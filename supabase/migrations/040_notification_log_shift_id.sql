-- notification_logs에 shift_id 컬럼 추가 (근무지별 발송 기록 구분)
ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES daily_shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_shift_id ON notification_logs(shift_id);
