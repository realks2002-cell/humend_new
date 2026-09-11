-- 급구 공고: 상태는 모집중(open) 그대로 두고 급구 표시만 추가 (앱·지원 검사는 open 기준 그대로 동작)
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;
