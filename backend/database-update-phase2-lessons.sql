-- ============================================================================
-- PHASE 2: UPDATE LESSONS TABLE
-- Add missing columns required by Phase 2 code
-- ============================================================================

-- Add difficulty_score column
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS difficulty_score INT DEFAULT 1;

-- Add lesson_type column
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(50) DEFAULT 'general';

-- Add is_premium column
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Add constraint for difficulty_score (1-10)
ALTER TABLE lessons
ADD CONSTRAINT check_difficulty_score
CHECK (difficulty_score >= 1 AND difficulty_score <= 10);

-- Add constraint for lesson_type
ALTER TABLE lessons
ADD CONSTRAINT check_lesson_type
CHECK (lesson_type IN ('grammar', 'vocabulary', 'conversation', 'reading', 'listening', 'writing', 'general'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_lessons_difficulty_score ON lessons(difficulty_score);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_type ON lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_lessons_is_premium ON lessons(is_premium);

-- Update category to lesson_type for existing records (if needed)
-- This is safe because we set a default value above

COMMENT ON COLUMN lessons.difficulty_score IS 'Difficulty rating from 1 (easiest) to 10 (hardest)';
COMMENT ON COLUMN lessons.lesson_type IS 'Type of lesson: grammar, vocabulary, conversation, etc.';
COMMENT ON COLUMN lessons.is_premium IS 'Whether this lesson requires a premium subscription';
