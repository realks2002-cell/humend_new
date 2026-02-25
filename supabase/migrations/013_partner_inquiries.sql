CREATE TABLE partner_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name varchar(255) NOT NULL,
  contact_person varchar(100) NOT NULL,
  contact_phone varchar(20) NOT NULL,
  contact_email varchar(255),
  message text,
  status varchar(20) DEFAULT 'pending',  -- pending / contacted / closed
  created_at timestamptz DEFAULT now()
);

-- RLS: 누구나 INSERT 가능 (공개 폼), SELECT는 관리자만
ALTER TABLE partner_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert" ON partner_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read all" ON partner_inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update" ON partner_inquiries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );
