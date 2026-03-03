-- parental_consents 테이블 RLS 정책 추가
-- Capacitor 로컬 번들에서 browser client로 직접 조회 가능하도록

ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

-- 회원: 본인 동의서 조회
CREATE POLICY "parental_consents_select_own" ON parental_consents
  FOR SELECT USING (auth.uid() = member_id);

-- 관리자: 전체 접근
CREATE POLICY "parental_consents_admin_all" ON parental_consents
  FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));
