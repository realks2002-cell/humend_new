ALTER TABLE members ADD COLUMN IF NOT EXISTS api_key UUID DEFAULT gen_random_uuid() UNIQUE;
CREATE INDEX IF NOT EXISTS idx_members_api_key ON members(api_key);
UPDATE members SET api_key = gen_random_uuid() WHERE api_key IS NULL;
