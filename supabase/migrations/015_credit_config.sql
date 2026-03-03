-- Credit configuration table (singleton)
CREATE TABLE IF NOT EXISTS credit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_value_cents INTEGER NOT NULL DEFAULT 25,          -- 25 cents = $0.25 per credit
  max_discount_percentage INTEGER NOT NULL DEFAULT 75,     -- Max 75% of subscription price
  is_redemption_active BOOLEAN NOT NULL DEFAULT true,      -- Whether redemption is enabled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default config
INSERT INTO credit_config (credit_value_cents, max_discount_percentage, is_redemption_active)
VALUES (25, 75, true);

-- RLS
ALTER TABLE credit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read credit config"
  ON credit_config FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage credit config"
  ON credit_config FOR ALL
  USING (auth.role() = 'service_role');

-- Atomic function to spend credits (decrement balance, increment total_spent)
-- Returns true if successful, false if insufficient balance
CREATE OR REPLACE FUNCTION spend_user_credits(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE user_credits
  SET
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
