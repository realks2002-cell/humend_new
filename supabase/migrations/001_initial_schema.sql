-- ============================================
-- Humend HR - Initial Schema (Supabase/PostgreSQL)
-- PRD v1.0 기반, Phase 1 MVP
-- ============================================

-- 1. 회원 테이블 (Supabase Auth 연동)
CREATE TABLE members (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone varchar(20) NOT NULL UNIQUE,
  name varchar(100),
  birth_date date,
  gender varchar(10),
  region varchar(100),
  has_experience boolean DEFAULT false,
  experience_detail text,
  profile_image_url varchar(500),
  bank_name varchar(50),
  account_holder varchar(50),
  account_number varchar(50),
  status varchar(20) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 관리자 테이블 (Supabase Auth 연동)
CREATE TABLE admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  role varchar(50) DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- 3. 고객사 테이블
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name varchar(255) NOT NULL,
  location varchar(255),
  contact_person varchar(100),
  contact_phone varchar(20),
  hourly_wage int DEFAULT 0,
  main_image_url varchar(500),
  description text,
  dress_code text,
  work_guidelines text,
  status varchar(20) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. 고객사 현장 사진 테이블
CREATE TABLE client_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  image_url varchar(500) NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. 채용공고 (날짜 슬롯) 테이블
CREATE TABLE job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  headcount int DEFAULT 1,
  status varchar(20) DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. 지원 테이블
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status varchar(20) DEFAULT '대기',
  applied_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  admin_memo text,
  UNIQUE(posting_id, member_id)  -- 중복 지원 방지
);

-- ============================================
-- updated_at 자동 갱신 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- members: 본인만 읽기/수정, 관리자 전체 접근
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "members_insert_own" ON members
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "members_admin_all" ON members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- admins: 관리자만 접근
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_own" ON admins
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admins_admin_all" ON admins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- clients: 전체 읽기, 관리자만 쓰기
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_all" ON clients
  FOR SELECT USING (true);

CREATE POLICY "clients_admin_write" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- client_photos: 전체 읽기, 관리자만 쓰기
ALTER TABLE client_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_photos_select_all" ON client_photos
  FOR SELECT USING (true);

CREATE POLICY "client_photos_admin_write" ON client_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- job_postings: 전체 읽기, 관리자만 쓰기
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_postings_select_all" ON job_postings
  FOR SELECT USING (true);

CREATE POLICY "job_postings_admin_write" ON job_postings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- applications: 본인 지원건 읽기/쓰기, 관리자 전체 접근
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_select_own" ON applications
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "applications_insert_own" ON applications
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "applications_admin_all" ON applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_job_postings_client_id ON job_postings(client_id);
CREATE INDEX idx_job_postings_work_date ON job_postings(work_date);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_applications_posting_id ON applications(posting_id);
CREATE INDEX idx_applications_member_id ON applications(member_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_client_photos_client_id ON client_photos(client_id);

-- ============================================
-- Storage 버킷 생성
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-photos', 'profile-photos', false),
  ('client-images', 'client-images', true);

-- Storage RLS: profile-photos (본인만 업로드/조회)
CREATE POLICY "profile_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_photos_admin" ON storage.objects
  FOR ALL USING (
    bucket_id = 'profile-photos'
    AND EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );

-- Storage RLS: client-images (전체 읽기, 관리자만 업로드)
CREATE POLICY "client_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-images');

CREATE POLICY "client_images_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-images'
    AND EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  );
