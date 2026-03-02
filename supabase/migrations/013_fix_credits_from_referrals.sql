-- Backfill credit_transactions from completed referrals that have no matching transaction
-- For referrers
INSERT INTO credit_transactions (user_id, amount, type, description, referral_id, created_at)
SELECT
  r.referrer_id,
  r.credits_awarded_referrer,
  'referral_bonus',
  'Referral bonus — your invite purchased a subscription',
  r.id,
  r.completed_at
FROM referrals r
WHERE r.status = 'completed'
  AND r.credits_awarded_referrer > 0
  AND NOT EXISTS (
    SELECT 1 FROM credit_transactions ct
    WHERE ct.referral_id = r.id AND ct.type = 'referral_bonus'
  );

-- For referred users
INSERT INTO credit_transactions (user_id, amount, type, description, referral_id, created_at)
SELECT
  r.referred_id,
  r.credits_awarded_referred,
  'referred_bonus',
  'Welcome bonus from referral',
  r.id,
  r.completed_at
FROM referrals r
WHERE r.status = 'completed'
  AND r.credits_awarded_referred > 0
  AND NOT EXISTS (
    SELECT 1 FROM credit_transactions ct
    WHERE ct.referral_id = r.id AND ct.type = 'referred_bonus'
  );

-- Recalculate all user_credits from credit_transactions
-- Update existing rows
UPDATE user_credits uc
SET
  balance = sub.total_earned - uc.total_spent,
  total_earned = sub.total_earned,
  updated_at = NOW()
FROM (
  SELECT user_id, COALESCE(SUM(amount), 0) AS total_earned
  FROM credit_transactions
  GROUP BY user_id
) sub
WHERE uc.user_id = sub.user_id
  AND uc.total_earned <> sub.total_earned;

-- Insert missing rows
INSERT INTO user_credits (user_id, balance, total_earned, total_spent, updated_at)
SELECT
  ct.user_id,
  COALESCE(SUM(ct.amount), 0),
  COALESCE(SUM(ct.amount), 0),
  0,
  NOW()
FROM credit_transactions ct
LEFT JOIN user_credits uc ON uc.user_id = ct.user_id
WHERE uc.user_id IS NULL
GROUP BY ct.user_id;
