-- ============================================
-- Humend HR - Phase 4: payments 테이블
-- 원본(work_records) / 최종확정(payments) 이중 보관
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_record_id uuid NOT NULL UNIQUE REFERENCES work_records(id) ON DELETE CASCADE,

  -- 급여 (관리자 수정 가능)
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

  -- 관리
  status varchar(20) DEFAULT '확정',  -- 확정 / 지급완료
  admin_memo text,
  paid_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 회원: work_record를 통해 본인 것만 조회
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM work_records WHERE work_records.id = payments.work_record_id AND work_records.member_id = auth.uid())
  );

-- 관리자 전체 접근
CREATE POLICY "payments_admin_all" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_payments_work_record_id ON payments(work_record_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================
-- updated_at 트리거
-- ============================================
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
