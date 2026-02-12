-- ============================================
-- Humend HR - 소득세 컬럼 추가
-- work_records 및 payments 테이블에 소득세(3.3%) 컬럼 추가
-- ============================================

-- work_records 테이블에 income_tax 컬럼 추가
ALTER TABLE work_records
ADD COLUMN IF NOT EXISTS income_tax int NOT NULL DEFAULT 0;

-- payments 테이블에 income_tax 컬럼 추가
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS income_tax int NOT NULL DEFAULT 0;

-- 주석 추가
COMMENT ON COLUMN work_records.income_tax IS '소득세 (총지급액의 3.3%)';
COMMENT ON COLUMN payments.income_tax IS '소득세 (총지급액의 3.3%)';
