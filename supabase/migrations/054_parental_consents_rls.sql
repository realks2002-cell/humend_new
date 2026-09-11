-- parental_consents RLS 재적용
-- 운영 DB에서 RLS가 꺼져 있어 앱(browser client)이 전체 행을 조회하던 문제 수정
-- 서버 코드는 모두 service role 사용 → 영향 없음

ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parental_consents_select_own" ON parental_consents;
DROP POLICY IF EXISTS "parental_consents_admin_all" ON parental_consents;

-- 회원: 본인 동의서 조회
CREATE POLICY "parental_consents_select_own" ON parental_consents
  FOR SELECT USING (auth.uid() = member_id);

-- 관리자: 전체 접근
CREATE POLICY "parental_consents_admin_all" ON parental_consents
  FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));
