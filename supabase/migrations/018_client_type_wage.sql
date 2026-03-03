-- 고객사 타입(일별/기간제) + 급여 타입(시급/일급/월급) 지원
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS wage_type VARCHAR(20) DEFAULT '시급',
  ADD COLUMN IF NOT EXISTS daily_wage INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_wage INT DEFAULT 0;
