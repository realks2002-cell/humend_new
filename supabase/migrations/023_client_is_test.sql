-- 테스트 고객사 분리를 위한 is_test 컬럼 추가
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;
