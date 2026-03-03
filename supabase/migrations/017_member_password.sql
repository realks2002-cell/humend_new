-- members 테이블에 password 컬럼 추가 (관리자가 회원 비밀번호 확인용)
ALTER TABLE members ADD COLUMN IF NOT EXISTS password varchar(100);
