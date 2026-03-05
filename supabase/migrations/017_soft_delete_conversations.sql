-- Add soft delete to conversations
ALTER TABLE conversations ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering out deleted conversations efficiently
CREATE INDEX idx_conversations_deleted_at ON conversations (user_id, deleted_at) WHERE deleted_at IS NULL;
