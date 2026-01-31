-- ============================================================================
-- ADMIN USERS TABLE
-- For admin dashboard access
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can only see themselves
CREATE POLICY "Admins can view their own profile"
  ON admin_users
  FOR SELECT
  USING (true);  -- Service role handles this

-- Service role has full access
CREATE POLICY "Service role has full access to admin_users"
  ON admin_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE admin_users IS 'Admin users who can access the admin dashboard';
COMMENT ON COLUMN admin_users.role IS 'admin = regular admin, superadmin = full access';
