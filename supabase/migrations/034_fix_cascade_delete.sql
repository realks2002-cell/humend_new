-- ============================================
-- 채용공고 삭제 시 근무내역/급여 연쇄삭제 방지
-- work_records.posting_id: ON DELETE CASCADE → ON DELETE SET NULL
-- ============================================

-- 1. NOT NULL 제약 제거 (이미 null로 사용하는 코드 존재)
ALTER TABLE work_records ALTER COLUMN posting_id DROP NOT NULL;

-- 2. 기존 CASCADE 외래키 제거
ALTER TABLE work_records DROP CONSTRAINT work_records_posting_id_fkey;

-- 3. SET NULL 외래키 재생성
ALTER TABLE work_records ADD CONSTRAINT work_records_posting_id_fkey
  FOREIGN KEY (posting_id) REFERENCES job_postings(id) ON DELETE SET NULL;
