-- ============================================
-- 주민등록번호 중복 가입 방지
-- rrn_front + rrn_back 부분 UNIQUE 인덱스
-- - rrn 미입력(null) 회원은 제외
-- - 비활성(inactive=소프트삭제) 회원은 제외 → 탈퇴 후 재가입 가능
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS members_rrn_unique
  ON members (rrn_front, rrn_back)
  WHERE rrn_front IS NOT NULL
    AND rrn_back IS NOT NULL
    AND status IS DISTINCT FROM 'inactive';
