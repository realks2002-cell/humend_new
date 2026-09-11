-- 알림톡 딥링크(https://humendhr.com/go/...) 클릭 기록 — 앱 미설치 회원이 설치 후 처음 열 때 원래 화면으로 보내기 위한 매칭(디퍼드 딥링크)
-- 같은 IP의 1시간 이내 미사용 클릭 1건을 앱 첫 실행 시 소비. service role 전용(RLS 켜고 정책 없음)
CREATE TABLE IF NOT EXISTS deeplink_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  target text NOT NULL,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_deeplink_clicks_ip ON deeplink_clicks (ip, created_at DESC);

ALTER TABLE deeplink_clicks ENABLE ROW LEVEL SECURITY;
