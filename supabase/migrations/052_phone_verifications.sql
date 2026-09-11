-- 회원가입 SMS 전화번호 인증 (웹 /signup)
-- 발송 1건 = 1행. 인증번호는 평문 저장 금지 — HMAC-SHA256 해시만 저장.
-- RLS: 정책 없음 = anon/authenticated 접근 불가, 서버(service_role)만 접근.

CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),   -- requestId (가입 시 verificationId로 사용, 요청자에게만 반환)
  phone varchar(20) NOT NULL,                      -- 숫자만 (members.phone과 동일 형식)
  code_hash text NOT NULL,                         -- hex(HMAC-SHA256(key, phone:code))
  ip text NOT NULL,                                -- 요청 IP ('unknown'이면 IP 한도 제외)
  attempts integer NOT NULL DEFAULT 0,             -- 검증 시도 횟수 (5회 한도)
  expires_at timestamptz NOT NULL,                 -- p_now + 3분
  verified_at timestamptz,                         -- 인증 성공 시각 (이후 10분 내 가입)
  consumed_at timestamptz,                         -- 가입 성공 시 기록 (1회성)
  created_at timestamptz NOT NULL DEFAULT now()    -- 예약 함수가 p_now로 명시해 넣음
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_ip ON phone_verifications (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_created_at ON phone_verifications (created_at DESC);

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON phone_verifications FROM anon, authenticated;

-- 발송 예약: 쿨다운·한도 검사와 INSERT를 번호/IP advisory lock 안에서 원자적으로 처리한다.
-- 거절된 요청은 행을 만들지 않는다. 시각은 호출자(서버) 시계 p_now 하나로 통일한다.
CREATE OR REPLACE FUNCTION reserve_phone_verification(
  p_phone text, p_ip text, p_code_hash text, p_now timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
SET lock_timeout = '2s'
AS $$
DECLARE
  v_last timestamptz;
  v_global integer;
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('phone_verifications:phone:' || p_phone, 0));
  IF p_ip <> 'unknown' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('phone_verifications:ip:' || p_ip, 0));
  END IF;

  SELECT max(created_at) INTO v_last FROM phone_verifications
   WHERE phone = p_phone AND created_at > p_now - interval '60 seconds';
  IF v_last IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'cooldown',
      'retry_after', greatest(1, ceil(extract(epoch FROM v_last + interval '60 seconds' - p_now)))::int);
  END IF;

  IF (SELECT count(*) FROM phone_verifications
       WHERE phone = p_phone AND created_at > p_now - interval '24 hours') >= 5 THEN
    RETURN jsonb_build_object('status', 'daily_limit');
  END IF;

  IF p_ip <> 'unknown' THEN
    IF (SELECT count(*) FROM phone_verifications
         WHERE ip = p_ip AND created_at > p_now - interval '10 minutes') >= 10 THEN
      RETURN jsonb_build_object('status', 'ip_limit');
    END IF;
    IF (SELECT count(*) FROM phone_verifications
         WHERE ip = p_ip AND created_at > p_now - interval '24 hours') >= 30 THEN
      RETURN jsonb_build_object('status', 'ip_limit');
    END IF;
  END IF;

  SELECT count(*) INTO v_global FROM phone_verifications
   WHERE created_at > p_now - interval '24 hours';
  IF v_global >= 500 THEN
    RETURN jsonb_build_object('status', 'global_limit');
  END IF;

  INSERT INTO phone_verifications (phone, ip, code_hash, expires_at, created_at)
  VALUES (p_phone, p_ip, p_code_hash, p_now + interval '3 minutes', p_now)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status', 'ok', 'id', v_id,
    'expires_at', p_now + interval '3 minutes', 'resend_after', 60,
    'alert', CASE WHEN v_global + 1 = 250 THEN 'global_half'
                  WHEN v_global + 1 = 500 THEN 'global_full' END);
END $$;

REVOKE ALL ON FUNCTION reserve_phone_verification(text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_phone_verification(text, text, text, timestamptz) TO service_role;
