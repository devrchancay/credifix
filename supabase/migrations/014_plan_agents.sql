-- =============================================
-- Plan-Agent relationship: maps which agents are available for each plan
-- =============================================

CREATE TABLE plan_agents (
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, agent_id)
);

-- Indexes
CREATE INDEX idx_plan_agents_plan_id ON plan_agents(plan_id);
CREATE INDEX idx_plan_agents_agent_id ON plan_agents(agent_id);

-- Row Level Security
ALTER TABLE plan_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan agents are publicly readable"
  ON plan_agents FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert plan_agents"
  ON plan_agents FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update plan_agents"
  ON plan_agents FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete plan_agents"
  ON plan_agents FOR DELETE
  USING (false);
