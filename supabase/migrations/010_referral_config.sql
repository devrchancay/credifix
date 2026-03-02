-- Create the referral_config table (referenced by service code but never migrated)
CREATE TABLE IF NOT EXISTS referral_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  credits_per_referral INTEGER NOT NULL DEFAULT 15,
  credits_for_referred INTEGER NOT NULL DEFAULT 15,
  max_referrals_per_user INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  require_subscription BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config row
INSERT INTO referral_config (credits_per_referral, credits_for_referred, is_active, require_subscription)
VALUES (15, 15, true, false);

-- RLS: allow service-role full access, no direct user access needed
ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on referral_config"
  ON referral_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
