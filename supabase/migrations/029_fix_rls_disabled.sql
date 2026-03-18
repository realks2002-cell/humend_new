-- parental_consents RLS 재활성화 (014에서 활성화했으나 비활성 상태)
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

-- spatial_ref_sys (PostGIS 시스템 테이블) RLS 활성화
-- 읽기 전용 참조 데이터이므로 모든 역할에 SELECT 허용
-- PostGIS 함수(ST_Distance 등)가 내부적으로 이 테이블을 참조함
ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spatial_ref_sys_select_all" ON spatial_ref_sys
  FOR SELECT USING (true);
