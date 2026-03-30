ALTER TABLE members ADD COLUMN IF NOT EXISTS apple_uid UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_apple_uid
  ON members(apple_uid) WHERE apple_uid IS NOT NULL;
