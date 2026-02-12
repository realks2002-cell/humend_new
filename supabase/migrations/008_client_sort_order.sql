-- ============================================
-- Humend HR - 고객사 정렬 순서 컬럼 추가
-- ============================================

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;

COMMENT ON COLUMN clients.sort_order IS '고객사 표시 순서 (낮을수록 먼저 표시)';
