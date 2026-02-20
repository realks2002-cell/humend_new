-- device_tokens: FCM 푸시 토큰 저장
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, fcm_token)
);

-- notification_logs: 발송 이력
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'individual', -- 'individual' | 'all'
  target_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  sent_count INT DEFAULT 0,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'auto'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 회원: 자기 토큰만 CRUD
CREATE POLICY "members_own_tokens" ON device_tokens
  FOR ALL USING (member_id = auth.uid());

-- 관리자: 전체 접근
CREATE POLICY "admins_all_device_tokens" ON device_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "admins_all_notification_logs" ON notification_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- 인덱스
CREATE INDEX idx_device_tokens_member_id ON device_tokens(member_id);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at DESC);
