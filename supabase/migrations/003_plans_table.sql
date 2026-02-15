-- Plans table
CREATE TABLE plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  stripe_monthly_price_id TEXT,
  stripe_yearly_price_id TEXT,
  features JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_plans_slug ON plans(slug);
CREATE INDEX idx_plans_sort_order ON plans(sort_order);

-- Updated_at trigger
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add plan_id FK to subscriptions
ALTER TABLE subscriptions ADD COLUMN plan_id UUID REFERENCES plans(id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);

-- RLS: public read, service role write
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable"
  ON plans FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert plans"
  ON plans FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update plans"
  ON plans FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete plans"
  ON plans FOR DELETE
  USING (false);

-- Seed plans
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, stripe_monthly_price_id, stripe_yearly_price_id, features, limits, is_active, is_popular, sort_order) VALUES
(
  'Free',
  'free',
  'For individuals getting started',
  0,
  0,
  NULL,
  NULL,
  '["Up to 3 projects", "Basic analytics", "Community support", "1 team member"]',
  '{"projects": 3, "members": 1}',
  TRUE,
  FALSE,
  0
),
(
  'Pro',
  'pro',
  'For professionals and small teams',
  1900,
  19000,
  NULL,
  NULL,
  '["Unlimited projects", "Advanced analytics", "Priority support", "Up to 10 team members", "Custom integrations", "API access"]',
  '{"projects": -1, "members": 10}',
  TRUE,
  TRUE,
  1
),
(
  'Enterprise',
  'enterprise',
  'For large organizations',
  9900,
  99000,
  NULL,
  NULL,
  '["Everything in Pro", "Unlimited team members", "Dedicated support", "SLA guarantee", "SSO/SAML", "Custom contracts"]',
  '{"projects": -1, "members": -1}',
  TRUE,
  FALSE,
  2
);
