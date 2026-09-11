-- 관리자가 지원 건별로 근무지·근무시간을 수정 (공고는 그대로, 해당 회원 지원 건에만 적용)
-- NULL이면 공고 값을 그대로 사용
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS override_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_start_time time,
  ADD COLUMN IF NOT EXISTS override_end_time time;

-- 회원은 applications에 직접 insert 가능(RLS) → 새 지원에는 수정값을 넣지 못하게 비움
CREATE OR REPLACE FUNCTION clear_application_overrides()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.override_client_id := NULL;
  NEW.override_start_time := NULL;
  NEW.override_end_time := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_application_overrides ON applications;
CREATE TRIGGER trg_clear_application_overrides
  BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION clear_application_overrides();
