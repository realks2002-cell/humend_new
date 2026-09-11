-- 회원 지원 제한 — 웹·앱(직접 insert)·재지원·AI 상담 등 모든 경로에 DB에서 공통 적용
--  1) 모집중(open) 공고에만 지원 가능 (마감·종료 공고 지원 차단)
--  2) 날짜별(daily) 공고는 같은 근무일에 최대 3건(대기+승인)까지
-- 검사 시점: 새 지원(INSERT), 취소→대기 재지원(UPDATE). 승인·거절·대기로 되돌리기 등 관리자 상태 변경은 검사하지 않음
CREATE OR REPLACE FUNCTION check_application_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p job_postings%ROWTYPE;
  same_day int;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT (OLD.status = '취소' AND NEW.status = '대기') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO p FROM job_postings WHERE id = NEW.posting_id;
  IF NOT FOUND OR p.status <> 'open' THEN
    RAISE EXCEPTION '마감되었습니다.';
  END IF;

  IF COALESCE(p.posting_type, 'daily') <> 'fixed_term' THEN
    -- 동시 지원으로 3건을 넘지 않도록 회원+근무일 단위 잠금
    PERFORM pg_advisory_xact_lock(hashtext(NEW.member_id::text || ':' || p.work_date::text));
    SELECT count(*) INTO same_day
      FROM applications a
      JOIN job_postings jp ON jp.id = a.posting_id
     WHERE a.member_id = NEW.member_id
       AND a.id <> NEW.id
       AND a.status IN ('대기', '승인')
       AND jp.work_date = p.work_date
       AND COALESCE(jp.posting_type, 'daily') <> 'fixed_term';
    IF same_day >= 3 THEN
      RAISE EXCEPTION '같은 날짜에는 최대 3건까지 지원할 수 있습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_application_allowed ON applications;
CREATE TRIGGER trg_check_application_allowed
  BEFORE INSERT OR UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION check_application_allowed();
