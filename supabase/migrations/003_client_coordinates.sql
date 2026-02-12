-- ============================================
-- Humend HR - Phase 3: 고객사 좌표 (카카오맵)
-- clients 테이블에 latitude/longitude 추가
-- ============================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude double precision;
