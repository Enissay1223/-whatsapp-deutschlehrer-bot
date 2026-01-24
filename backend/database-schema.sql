-- ============================================================================
-- DEUTSCHLEHRER BOT - DATABASE SCHEMA
-- ============================================================================
-- This schema works with Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USER PROFILES (Extended from Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

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

  -- Usage Limits (for Free Tier)
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

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_telegram_id ON user_profiles(telegram_id);
CREATE INDEX idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- ============================================================================
-- 2. LESSONS (Created by Admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,

  -- Classification
  level VARCHAR(2) NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  category VARCHAR(50) NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Structured Data
  exercises JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,

  -- Vector DB Reference
  pinecone_id TEXT,
  embedding_version VARCHAR(20) DEFAULT 'v1',

  -- Publishing
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),

  -- Stats
  view_count INT DEFAULT 0,
  completion_count INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lessons
CREATE INDEX idx_lessons_level ON lessons(level);
CREATE INDEX idx_lessons_category ON lessons(category);
CREATE INDEX idx_lessons_is_published ON lessons(is_published);
CREATE INDEX idx_lessons_tags ON lessons USING GIN(tags);

-- ============================================================================
-- 3. CONVERSATIONS (Chat History - Telegram + Webapp)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Context
  lesson_id UUID REFERENCES lessons(id),
  ai_model VARCHAR(50),
  prompt_tokens INT,
  completion_tokens INT,

  -- Platform
  platform VARCHAR(20) CHECK (platform IN ('telegram', 'webapp')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_platform ON conversations(platform);

-- ============================================================================
-- 4. USER PROGRESS (Lesson Completion & Scores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

  status VARCHAR(20) DEFAULT 'started' CHECK (status IN ('started', 'completed', 'mastered')),
  score INT CHECK (score >= 0 AND score <= 100),
  attempts INT DEFAULT 1,

  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  UNIQUE(user_id, lesson_id)
);

-- Indexes for user_progress
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX idx_user_progress_status ON user_progress(status);

-- ============================================================================
-- 5. ACHIEVEMENTS (Badges & Milestones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_awarded INT DEFAULT 0,

  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for achievements
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_earned_at ON achievements(earned_at DESC);

-- ============================================================================
-- 6. SUBSCRIPTION EVENTS (Payment History for Admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  old_tier VARCHAR(20),
  new_tier VARCHAR(20),

  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',

  stripe_event_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscription_events
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- ============================================================================
-- 7. PAYMENT TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

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

-- Indexes for payment_transactions
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- ============================================================================
-- 8. SYSTEM LOGS (For Admin Monitoring)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  log_level VARCHAR(20) CHECK (log_level IN ('info', 'warning', 'error', 'critical')),
  service VARCHAR(50),
  message TEXT NOT NULL,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for system_logs
CREATE INDEX idx_system_logs_log_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
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

-- ============================================================================
-- FUNCTIONS: Helper Functions
-- ============================================================================

-- Function to reset daily message count
CREATE OR REPLACE FUNCTION reset_daily_message_counts()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET daily_message_count = 0,
      last_message_reset = CURRENT_DATE
  WHERE last_message_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user level based on XP
CREATE OR REPLACE FUNCTION calculate_user_level(xp INT)
RETURNS INT AS $$
BEGIN
  -- Level = sqrt(XP / 100)
  -- Level 1: 0-99 XP
  -- Level 2: 100-399 XP
  -- Level 3: 400-899 XP
  -- etc.
  RETURN FLOOR(SQRT(xp / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update user level when XP changes
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Lessons: Published lessons are public, drafts only for creators
CREATE POLICY "Published lessons are viewable by all" ON lessons
  FOR SELECT USING (is_published = true);

CREATE POLICY "Creators can view own lessons" ON lessons
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Creators can insert lessons" ON lessons
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own lessons" ON lessons
  FOR UPDATE USING (auth.uid() = created_by);

-- Conversations: Users can only access their own
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Progress: Users can only access their own
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Achievements: Users can only access their own
CREATE POLICY "Users can view own achievements" ON achievements
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA: Sample Lessons (Optional)
-- ============================================================================

-- You can add sample lessons here after you have an admin user
-- For now, we'll leave this empty and add via the Admin Panel

-- ============================================================================
-- MATERIALIZED VIEWS: For Admin Dashboard (Performance)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS admin_dashboard_metrics AS
SELECT
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as users_today,
  COUNT(*) FILTER (WHERE subscription_tier = 'premium') as premium_users,
  COUNT(*) as total_users,
  COALESCE(SUM(
    CASE WHEN subscription_tier = 'premium' AND subscription_status = 'active' THEN 9.99 ELSE 0 END
  ), 0) as mrr,
  COUNT(*) FILTER (WHERE last_activity_date = CURRENT_DATE) as active_users_today
FROM user_profiles;

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_admin_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Configure Supabase Auth (Email, Google OAuth, etc.)
-- 3. Get your Supabase URL and Keys
-- 4. Update backend/.env with credentials
-- ============================================================================
