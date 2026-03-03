-- 기간제 공고 지원을 위한 job_postings 테이블 확장
-- posting_type: 'daily'(기존 일별) | 'fixed_term'(기간제)

-- 컬럼 추가
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS posting_type VARCHAR(20) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS work_days JSONB,
  ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- CHECK 제약조건: fixed_term이면 start_date, end_date, work_days 필수
ALTER TABLE job_postings
  ADD CONSTRAINT chk_fixed_term_fields
  CHECK (
    posting_type = 'daily'
    OR (
      posting_type = 'fixed_term'
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
      AND work_days IS NOT NULL
    )
  );

-- CHECK 제약조건: end_date >= start_date
ALTER TABLE job_postings
  ADD CONSTRAINT chk_date_range
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_job_postings_posting_type ON job_postings (posting_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_date_range ON job_postings (start_date, end_date);
