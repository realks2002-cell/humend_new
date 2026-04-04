-- 채팅방 (회원당 1개)
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',       -- active, archived
  mode TEXT NOT NULL DEFAULT 'ai',             -- ai, admin
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_member INT NOT NULL DEFAULT 0,
  unread_count_admin INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id)
);

-- 채팅 메시지
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,                   -- member, ai, admin
  sender_id UUID,                              -- member_id 또는 admin_id
  content TEXT NOT NULL,
  metadata JSONB,                              -- AI tool 결과, 첨부 등
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 대화 컨텍스트
CREATE TABLE chat_ai_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  summary TEXT,
  tool_history JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id)
);

-- RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_ai_contexts ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 채팅방만
CREATE POLICY "members_own_rooms" ON chat_rooms
  FOR ALL USING (member_id = auth.uid());

-- 회원: 본인 채팅방 메시지만
CREATE POLICY "members_own_messages" ON chat_messages
  FOR ALL USING (
    room_id IN (SELECT id FROM chat_rooms WHERE member_id = auth.uid())
  );

-- 관리자: 전체 접근
CREATE POLICY "admins_all_chat_rooms" ON chat_rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "admins_all_chat_messages" ON chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "admins_all_ai_contexts" ON chat_ai_contexts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- 인덱스
CREATE INDEX idx_chat_rooms_member_id ON chat_rooms(member_id);
CREATE INDEX idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_rooms_unread_admin ON chat_rooms(unread_count_admin) WHERE unread_count_admin > 0;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_chat_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_chat_rooms_updated_at();

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
