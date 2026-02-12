-- ============================================================================
-- MIGRATION: Multi-Language Learning Support
-- ============================================================================
-- Run this in Supabase SQL Editor after the main schema

-- Add target language to user_profiles (what language they want to learn)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS target_language VARCHAR(10) DEFAULT 'de';

-- Add target level (generalization of german_level)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS target_level VARCHAR(2) DEFAULT 'A1'
CHECK (target_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

-- Add language to lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'de';

-- Add lesson_type values
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_lesson_type_check;

-- Add content_format for rich text support (Phase 3)
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS content_format VARCHAR(20) DEFAULT 'plain';

-- Add conversation_history table if not exists
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  ai_response TEXT,
  has_corrections BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_history_user_id ON conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at DESC);

-- Migrate existing german_level data to target_level
UPDATE user_profiles
SET target_language = 'de',
    target_level = german_level
WHERE target_level IS NULL AND german_level IS NOT NULL;

-- Index for language-filtered lesson queries
CREATE INDEX IF NOT EXISTS idx_lessons_language ON lessons(language);

-- ============================================================================
-- COMPLETE
-- ============================================================================
