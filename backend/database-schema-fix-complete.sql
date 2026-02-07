-- ============================================================================
-- COMPLETE FIX: Alle Tabellen für Telegram + Webapp Support
-- ============================================================================
-- Führen Sie dieses Script in Supabase SQL Editor aus
-- Es löscht die alten Tabellen und erstellt neue
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ALTE TABELLEN LÖSCHEN (in richtiger Reihenfolge)
-- ============================================================================

DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS subscription_events CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP MATERIALIZED VIEW IF EXISTS admin_dashboard_metrics CASCADE;

-- ============================================================================
-- 2. USER PROFILES (NEU - mit eigenständiger ID)
-- ============================================================================

CREATE TABLE user_profiles (
  -- Eigenständige ID (funktioniert für Telegram UND Webapp)
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Optional: Verknüpfung zu Supabase Auth (nur für Webapp-User)
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  telegram_id BIGINT UNIQUE,
  display_name TEXT NOT NULL,
  native_language VARCHAR(50),
  german_level VARCHAR(2) CHECK (german_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  learning_goal TEXT,

  -- Subscription Info
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  stripe_customer_id TEXT UNIQUE,
  subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,

  -- Gamification
  experience_points INT DEFAULT 0,
  current_level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  last_activity_date DATE,

  -- Usage Limits
  daily_message_count INT DEFAULT 0,
  daily_message_limit INT DEFAULT 10,
  last_message_reset DATE DEFAULT CURRENT_DATE,

  -- Registration Info
  registration_source VARCHAR(20) CHECK (registration_source IN ('telegram', 'webapp')),
  registration_step INT DEFAULT 0,
  registration_data JSONB DEFAULT '{}'::jsonb,
  registration_completed BOOLEAN DEFAULT false,

  -- Preferences
  preferred_language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_user_profiles_telegram_id ON user_profiles(telegram_id);
CREATE INDEX idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);

-- ============================================================================
-- 3. LESSONS (unverändert, aber created_by ist jetzt optional)
-- ============================================================================

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  level VARCHAR(2) NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  category VARCHAR(50) NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  exercises JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  pinecone_id TEXT,
  embedding_version VARCHAR(20) DEFAULT 'v1',
  is_published BOOLEAN DEFAULT false,
  created_by UUID, -- Optional, kann NULL sein
  view_count INT DEFAULT 0,
  completion_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_level ON lessons(level);
CREATE INDEX idx_lessons_category ON lessons(category);
CREATE INDEX idx_lessons_is_published ON lessons(is_published);

-- ============================================================================
-- 4. CONVERSATIONS (user_id referenziert jetzt user_profiles.id)
-- ============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  lesson_id UUID REFERENCES lessons(id),
  ai_model VARCHAR(50),
  prompt_tokens INT,
  completion_tokens INT,
  platform VARCHAR(20) CHECK (platform IN ('telegram', 'webapp')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- ============================================================================
-- 5. USER PROGRESS
-- ============================================================================

CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'started' CHECK (status IN ('started', 'completed', 'mastered')),
  score INT CHECK (score >= 0 AND score <= 100),
  attempts INT DEFAULT 1,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_lesson_id ON user_progress(lesson_id);

-- ============================================================================
-- 6. ACHIEVEMENTS
-- ============================================================================

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_awarded INT DEFAULT 0,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_user_id ON achievements(user_id);

-- ============================================================================
-- 7. SUBSCRIPTION EVENTS
-- ============================================================================

CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  old_tier VARCHAR(20),
  new_tier VARCHAR(20),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  stripe_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);

-- ============================================================================
-- 8. PAYMENT TRANSACTIONS
-- ============================================================================

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_payment_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(20) CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  payment_method VARCHAR(20),
  invoice_url TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);

-- ============================================================================
-- 9. SYSTEM LOGS
-- ============================================================================

CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_level VARCHAR(20) CHECK (log_level IN ('info', 'warning', 'error', 'critical')),
  service VARCHAR(50),
  message TEXT NOT NULL,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_logs_log_level ON system_logs(log_level);

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Level calculation
CREATE OR REPLACE FUNCTION calculate_user_level(xp INT)
RETURNS INT AS $$
BEGIN
  RETURN FLOOR(SQRT(xp / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_level = calculate_user_level(NEW.experience_points);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_level_on_xp_change
    BEFORE UPDATE OF experience_points ON user_profiles
    FOR EACH ROW
    WHEN (OLD.experience_points IS DISTINCT FROM NEW.experience_points)
    EXECUTE FUNCTION update_user_level();

-- ============================================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = auth_user_id
  );

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = auth_user_id
  );

-- Service role kann alles (wichtig für Telegram Bot!)
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL USING (true);

-- Lessons Policies
CREATE POLICY "Published lessons viewable" ON lessons
  FOR SELECT USING (is_published = true);

-- Conversations Policies
CREATE POLICY "Users view own conversations" ON conversations
  FOR SELECT USING (
    user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- 12. MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW admin_dashboard_metrics AS
SELECT
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as users_today,
  COUNT(*) FILTER (WHERE subscription_tier = 'premium') as premium_users,
  COUNT(*) as total_users,
  COALESCE(SUM(
    CASE WHEN subscription_tier = 'premium' AND subscription_status = 'active' THEN 9.99 ELSE 0 END
  ), 0) as mrr,
  COUNT(*) FILTER (WHERE last_activity_date = CURRENT_DATE) as active_users_today
FROM user_profiles;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Prüfen Sie: SELECT * FROM user_profiles LIMIT 5;
-- ============================================================================
