-- 가족관계증명서 업로드 (미성년자 근로)
-- 민감정보: 비공개 버킷 저장, 조회는 서버(service role)에서 signed URL 발급
-- 경로: {member_id}/family_cert_{timestamp}.{ext}

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS family_cert_path text,
  ADD COLUMN IF NOT EXISTS family_cert_uploaded_at timestamptz;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'family-certs',
  'family-certs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;
