-- ============================================================================
-- PHASE 2: UPDATE LESSONS TABLE (V2 - Safe Version)
-- Add missing columns required by Phase 2 code
-- ============================================================================

-- Add difficulty_score column (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'difficulty_score'
  ) THEN
    ALTER TABLE lessons ADD COLUMN difficulty_score INT DEFAULT 1;
  END IF;
END $$;

-- Add lesson_type column (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'lesson_type'
  ) THEN
    ALTER TABLE lessons ADD COLUMN lesson_type VARCHAR(50) DEFAULT 'general';
  END IF;
END $$;

-- Add is_premium column (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE lessons ADD COLUMN is_premium BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Drop existing constraints if they exist, then recreate them
DO $$
BEGIN
  -- Drop check_difficulty_score if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_difficulty_score' AND table_name = 'lessons'
  ) THEN
    ALTER TABLE lessons DROP CONSTRAINT check_difficulty_score;
  END IF;

  -- Add constraint for difficulty_score (1-10)
  ALTER TABLE lessons ADD CONSTRAINT check_difficulty_score
  CHECK (difficulty_score >= 1 AND difficulty_score <= 10);
END $$;

DO $$
BEGIN
  -- Drop check_lesson_type if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_lesson_type' AND table_name = 'lessons'
  ) THEN
    ALTER TABLE lessons DROP CONSTRAINT check_lesson_type;
  END IF;

  -- Add constraint for lesson_type
  ALTER TABLE lessons ADD CONSTRAINT check_lesson_type
  CHECK (lesson_type IN ('grammar', 'vocabulary', 'conversation', 'reading', 'listening', 'writing', 'general'));
END $$;

-- Create indexes (won't error if they already exist)
CREATE INDEX IF NOT EXISTS idx_lessons_difficulty_score ON lessons(difficulty_score);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_type ON lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_lessons_is_premium ON lessons(is_premium);

-- Add comments
COMMENT ON COLUMN lessons.difficulty_score IS 'Difficulty rating from 1 (easiest) to 10 (hardest)';
COMMENT ON COLUMN lessons.lesson_type IS 'Type of lesson: grammar, vocabulary, conversation, etc.';
COMMENT ON COLUMN lessons.is_premium IS 'Whether this lesson requires a premium subscription';
