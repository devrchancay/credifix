-- Recalculate user_credits from credit_transactions to fix lost updates
UPDATE user_credits
SET
  balance = sub.total_earned - user_credits.total_spent,
  total_earned = sub.total_earned,
  updated_at = NOW()
FROM (
  SELECT user_id, COALESCE(SUM(amount), 0) AS total_earned
  FROM credit_transactions
  GROUP BY user_id
) sub
WHERE user_credits.user_id = sub.user_id
  AND user_credits.total_earned <> sub.total_earned;

-- Also insert rows for users who have transactions but no user_credits row
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
