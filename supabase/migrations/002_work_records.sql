-- ============================================
-- Humend HR - Phase 2: 급여/계약 관리
-- work_records 테이블 + Storage 버킷
-- ============================================

-- 1. 근무내역(급여) 테이블
CREATE TABLE work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,

  -- 근무 정보
  client_name varchar(255) NOT NULL,
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes int DEFAULT 0,

  -- 급여 계산
  hourly_wage int NOT NULL DEFAULT 0,
  work_hours numeric(5,2) NOT NULL DEFAULT 0,
  overtime_hours numeric(5,2) NOT NULL DEFAULT 0,
  base_pay int NOT NULL DEFAULT 0,
  overtime_pay int NOT NULL DEFAULT 0,
  weekly_holiday_pay int NOT NULL DEFAULT 0,
  gross_pay int NOT NULL DEFAULT 0,

  -- 4대보험 공제
  national_pension int NOT NULL DEFAULT 0,
  health_insurance int NOT NULL DEFAULT 0,
  long_term_care int NOT NULL DEFAULT 0,
  employment_insurance int NOT NULL DEFAULT 0,
  total_deduction int NOT NULL DEFAULT 0,
  net_pay int NOT NULL DEFAULT 0,

  -- 상태 관리
  status varchar(20) DEFAULT '대기',
  -- 대기 → 확정 → 지급완료

  -- 전자서명 / 계약서
  signature_url varchar(500),
  contract_pdf_url varchar(500),
  signed_at timestamptz,

  -- 메모
  admin_memo text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- updated_at 트리거
CREATE TRIGGER work_records_updated_at
  BEFORE UPDATE ON work_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- 본인 읽기
CREATE POLICY "work_records_select_own" ON work_records
  FOR SELECT USING (auth.uid() = member_id);

-- 관리자 전체 접근
CREATE POLICY "work_records_admin_all" ON work_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_work_records_member_id ON work_records(member_id);
CREATE INDEX idx_work_records_posting_id ON work_records(posting_id);
CREATE INDEX idx_work_records_work_date ON work_records(work_date);
CREATE INDEX idx_work_records_status ON work_records(status);

-- ============================================
-- Storage 버킷: signatures, contracts
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('signatures', 'signatures', false),
  ('contracts', 'contracts', false);

-- signatures: 본인 업로드/조회, 관리자 전체
CREATE POLICY "signatures_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "signatures_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "signatures_admin" ON storage.objects
  FOR ALL USING (
    bucket_id = 'signatures'
    AND EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- contracts: 본인 조회, 관리자 전체
CREATE POLICY "contracts_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "contracts_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "contracts_admin" ON storage.objects
  FOR ALL USING (
    bucket_id = 'contracts'
    AND EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );
