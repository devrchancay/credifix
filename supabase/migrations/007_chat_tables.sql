-- =============================================
-- Chat conversations, messages, AI config, and knowledge files
-- =============================================

-- Conversations table: one per chat session per user
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  thread_id TEXT,  -- OpenAI thread ID if using Assistants API
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table: individual messages within a conversation
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI configuration table (singleton)
CREATE TABLE ai_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  temperature FLOAT NOT NULL DEFAULT 0.7,
  top_p FLOAT NOT NULL DEFAULT 1,
  vector_store_id TEXT,
  assistant_id TEXT,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Knowledge files table: tracks files uploaded to OpenAI Vector Store
CREATE TABLE knowledge_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  openai_file_id TEXT NOT NULL,
  vector_store_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_knowledge_files_vector_store_id ON knowledge_files(vector_store_id);

-- =============================================
-- Triggers
-- =============================================

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_config_updated_at
  BEFORE UPDATE ON ai_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only CRUD their own
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (user_id = auth.uid());

-- Messages: users can CRUD messages in their own conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their conversations"
  ON messages FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- AI Config: all authenticated users can read, only admin can update
CREATE POLICY "Authenticated users can read ai_config"
  ON ai_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update ai_config"
  ON ai_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert ai_config"
  ON ai_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Knowledge files: all authenticated can read, only admin can insert/delete
CREATE POLICY "Authenticated users can read knowledge_files"
  ON knowledge_files FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert knowledge_files"
  ON knowledge_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete knowledge_files"
  ON knowledge_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update knowledge_files"
  ON knowledge_files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- Seed: insert default AI config
-- =============================================

INSERT INTO ai_config (system_prompt) VALUES (
'You are a professional credit analysis assistant for Credifix. Your role is to help users understand and improve their credit profiles.

Your capabilities:
- Analyze credit report information shared by users
- Explain credit scoring factors (payment history, credit utilization, length of credit history, new credit, credit mix)
- Provide actionable recommendations to improve credit scores
- Answer questions about credit repair strategies
- Explain the impact of different financial decisions on credit scores
- Help users understand their rights under the Fair Credit Reporting Act (FCRA)

Guidelines:
- Always be professional, empathetic, and encouraging
- Never guarantee specific credit score improvements
- Recommend users verify information with their official credit reports
- If users share file attachments, acknowledge them and provide analysis based on the metadata
- Respond in the same language the user writes in (English or Spanish)
- Keep responses concise but thorough
- When discussing specific numbers or timelines, note they are estimates
- When information from the knowledge base is relevant, use it to provide accurate answers and cite the source

You are NOT a licensed financial advisor. Always recommend users consult with qualified professionals for specific financial decisions.'
);
