-- ============================================
-- 별도 근무 급여신청: posting_id NULL 허용
-- 공고 없이 별도 근무한 경우를 위해 posting_id를 nullable로 변경
-- ============================================

ALTER TABLE work_records ALTER COLUMN posting_id DROP NOT NULL;
