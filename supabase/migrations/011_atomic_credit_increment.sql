-- Atomic credit increment function to prevent lost updates from concurrent calls
CREATE OR REPLACE FUNCTION increment_user_credits(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance, total_earned, updated_at)
  VALUES (p_user_id, p_amount, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    balance = user_credits.balance + p_amount,
    total_earned = user_credits.total_earned + p_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
