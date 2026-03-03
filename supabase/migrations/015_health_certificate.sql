-- 보건증 제출 기능: members 테이블에 보건증 관련 컬럼 추가
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS health_cert_date date,
  ADD COLUMN IF NOT EXISTS health_cert_image_url varchar(500);
