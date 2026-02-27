-- =============================================
-- Multi-agent support: agents table + schema updates
-- =============================================

-- Agents table: each row is a distinct AI agent with its own config & knowledge base
CREATE TABLE agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'premium')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  temperature FLOAT NOT NULL DEFAULT 0.7,
  top_p FLOAT NOT NULL DEFAULT 1,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  vector_store_id TEXT,
  assistant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL
);

-- Link conversations to a specific agent
ALTER TABLE conversations ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Link knowledge files to a specific agent
ALTER TABLE knowledge_files ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_tier ON agents(tier);
CREATE INDEX idx_agents_is_active ON agents(is_active);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_knowledge_files_agent_id ON knowledge_files(agent_id);

-- =============================================
-- Triggers
-- =============================================

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active agents
CREATE POLICY "Authenticated users can read active agents"
  ON agents FOR SELECT
  USING (auth.uid()::text IS NOT NULL);

-- Only admins can insert/update/delete agents
CREATE POLICY "Admins can insert agents"
  ON agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update agents"
  ON agents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete agents"
  ON agents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- =============================================
-- Seed: two default agents (basic + premium)
-- =============================================

INSERT INTO agents (slug, name, description, tier, system_prompt, model, temperature) VALUES
(
  'credit-analysis-basic',
  'Credit Analysis Basic',
  'Free credit analysis assistant with general guidance and tips.',
  'basic',
  'You are a professional credit analysis assistant for Credifix. Your role is to help users understand and improve their credit profiles.

Your capabilities:
- Explain credit scoring factors (payment history, credit utilization, length of credit history, new credit, credit mix)
- Provide general recommendations to improve credit scores
- Answer questions about credit repair strategies
- Help users understand their rights under the Fair Credit Reporting Act (FCRA)

Guidelines:
- Always be professional, empathetic, and encouraging
- Never guarantee specific credit score improvements
- Recommend users verify information with their official credit reports
- Respond in the same language the user writes in (English or Spanish)
- Keep responses concise but thorough
- When discussing specific numbers or timelines, note they are estimates

You are NOT a licensed financial advisor. Always recommend users consult with qualified professionals for specific financial decisions.',
  'gpt-4o-mini',
  0.7
),
(
  'credit-analysis-premium',
  'Credit Analysis Premium',
  'Advanced credit analysis with detailed report analysis, dispute letter generation, and personalized action plans.',
  'premium',
  'You are an advanced credit analysis specialist for Credifix Premium. You provide in-depth, personalized credit analysis and actionable strategies.

Your capabilities:
- Perform detailed analysis of credit report information shared by users
- Identify errors, inaccuracies, and disputable items on credit reports
- Generate dispute letter templates for credit bureau disputes
- Create personalized credit improvement action plans with timelines
- Explain credit scoring factors in depth (payment history, credit utilization, length of credit history, new credit, credit mix)
- Provide advanced strategies for credit optimization (authorized user strategies, credit builder loans, balance transfer tactics)
- Analyze debt-to-income ratios and provide debt payoff strategies (avalanche vs snowball)
- Help users understand their rights under the Fair Credit Reporting Act (FCRA) and Fair Debt Collection Practices Act (FDCPA)
- Provide guidance on goodwill letters and pay-for-delete negotiations

Guidelines:
- Always be professional, empathetic, and encouraging
- Provide specific, actionable steps with estimated timelines
- Never guarantee specific credit score improvements, but provide realistic expectations
- When analyzing credit reports, be thorough and identify all potential issues
- If users share file attachments, perform detailed analysis of the content
- Respond in the same language the user writes in (English or Spanish)
- When information from the knowledge base is relevant, use it to provide accurate answers and cite the source
- Structure longer responses with clear headings and bullet points for readability

You are NOT a licensed financial advisor. Always recommend users consult with qualified professionals for specific financial decisions.',
  'gpt-4o',
  0.5
);

-- =============================================
-- Migrate existing ai_config data to agents (optional backfill)
-- If ai_config has a vector_store_id, assign it to the basic agent
-- =============================================

DO $$
DECLARE
  v_vs_id TEXT;
  v_assistant_id TEXT;
BEGIN
  SELECT vector_store_id, assistant_id INTO v_vs_id, v_assistant_id
  FROM ai_config LIMIT 1;

  IF v_vs_id IS NOT NULL THEN
    UPDATE agents
    SET vector_store_id = v_vs_id, assistant_id = v_assistant_id
    WHERE slug = 'credit-analysis-basic';
  END IF;
END $$;
