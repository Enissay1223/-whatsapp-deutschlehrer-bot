-- ============================================================================
-- FIX: Make category column nullable or add default value
-- The Phase 2 code uses lesson_type instead of category
-- ============================================================================

-- Option 1: Make category nullable (recommended for Phase 2)
ALTER TABLE lessons
ALTER COLUMN category DROP NOT NULL;

-- Option 2: Set a default value for category
ALTER TABLE lessons
ALTER COLUMN category SET DEFAULT 'general';

-- Update existing rows that might have NULL category
UPDATE lessons
SET category = lesson_type
WHERE category IS NULL AND lesson_type IS NOT NULL;

-- Or set to 'general' if both are NULL
UPDATE lessons
SET category = 'general'
WHERE category IS NULL;
