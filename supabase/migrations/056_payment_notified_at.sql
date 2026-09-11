-- 급여 지급 푸시 알림 중복 방지: 알림을 보낸(선점한) 시각
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- 기존 급여는 이미 지급된 건이므로 알림 대상에서 제외 (배포 직후 과거 건 일괄 발송 방지)
UPDATE payments SET notified_at = now() WHERE notified_at IS NULL;
