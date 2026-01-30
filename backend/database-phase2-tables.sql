-- ============================================================================
-- PHASE 2: CONVERSATION HISTORY TABLE
-- ============================================================================
-- This table stores all chat messages and AI responses for context and analytics

CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
  ai_response TEXT,
  has_corrections BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_history_user_id ON conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_history_user_created ON conversation_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own conversation history"
  ON conversation_history
  FOR SELECT
  USING (auth.uid() = (SELECT auth_user_id FROM user_profiles WHERE id = user_id));

CREATE POLICY "Users can insert their own messages"
  ON conversation_history
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM user_profiles WHERE id = user_id));

-- Service role bypass (for backend operations)
CREATE POLICY "Service role has full access to conversation_history"
  ON conversation_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE conversation_history IS 'Stores all user messages and AI responses for context and analytics';
