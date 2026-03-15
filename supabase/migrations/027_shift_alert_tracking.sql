-- 출근 알림 마지막 발송 시각 추적
ALTER TABLE daily_shifts ADD COLUMN last_alert_at TIMESTAMPTZ;
