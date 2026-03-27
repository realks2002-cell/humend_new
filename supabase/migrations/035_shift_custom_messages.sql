-- ============================================================
-- 035: 근무배정 커스텀 알림 메시지 컬럼 추가
-- ============================================================

ALTER TABLE daily_shifts
  ADD COLUMN IF NOT EXISTS custom_notify_message TEXT,
  ADD COLUMN IF NOT EXISTS custom_repeat_message TEXT;
