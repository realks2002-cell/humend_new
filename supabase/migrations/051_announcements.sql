-- 인앱 공지(메시지) 팝업 시스템
-- 관리자가 작성한 공지를 회원이 앱/웹 진입 시 모달로 표시. 한 번 확인하면 재노출 안 함.
-- 기존 FCM 푸시(notification_logs)와는 별개 — 푸시는 OS 트레이, 이건 인앱 모달.

-- 공지 본문
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target_type text NOT NULL DEFAULT 'all',   -- 'all' | 'users'
  font_size integer NOT NULL DEFAULT 16,      -- 본문 글씨 크기(px)
  is_active boolean NOT NULL DEFAULT true,    -- 소프트 삭제
  expires_at timestamptz,                     -- null이면 무기한
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- '개별 선택' 발송 대상 (target_type='users'일 때만)
CREATE TABLE IF NOT EXISTS announcement_targets (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, user_id)
);

-- 회원별 읽음 기록
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads (user_id);

-- RLS: 기본 deny. 관리자 쓰기는 service_role(RLS 우회), 회원 조회/읽음은 아래 SECURITY DEFINER RPC로만 접근.
-- (직접 접근 정책을 만들지 않음 = anon/authenticated는 테이블 직접 접근 불가)
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads   ENABLE ROW LEVEL SECURITY;

-- (a) 현재 회원이 아직 안 읽은 공지 조회
CREATE OR REPLACE FUNCTION get_unread_announcements()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'title', a.title, 'body', a.body,
    'font_size', a.font_size, 'created_at', a.created_at
  ) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO result
  FROM announcements a
  WHERE a.is_active = true
    AND (a.expires_at IS NULL OR a.expires_at > now())
    AND NOT EXISTS (
      SELECT 1 FROM announcement_reads r
       WHERE r.announcement_id = a.id AND r.user_id = v_uid)
    AND (
      a.target_type = 'all'
      OR (a.target_type = 'users' AND EXISTS (
            SELECT 1 FROM announcement_targets t
             WHERE t.announcement_id = a.id AND t.user_id = v_uid))
    );
  RETURN result;
END $$;

-- (b) 읽음 처리
CREATE OR REPLACE FUNCTION mark_announcement_read(p_announcement_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, v_uid)
  ON CONFLICT DO NOTHING;
END $$;

GRANT EXECUTE ON FUNCTION get_unread_announcements() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_announcement_read(uuid) TO authenticated;
