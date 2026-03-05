-- Atomic function to complete a pending referral and award credits.
-- Uses SELECT ... FOR UPDATE to prevent double-completion race conditions.
-- Returns the referral ID if completed, NULL if no pending referral found.
CREATE OR REPLACE FUNCTION complete_referral_and_award_credits(
  p_referred_id UUID,
  p_credits_per_referral INTEGER,
  p_credits_for_referred INTEGER
) RETURNS UUID AS $$
DECLARE
  v_referral RECORD;
  v_referral_id UUID;
BEGIN
  -- Lock the pending referral row to prevent concurrent completion
  SELECT id, referrer_id
  INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_id
    AND status = 'pending'
  FOR UPDATE SKIP LOCKED;

  IF v_referral IS NULL THEN
    RETURN NULL;
  END IF;

  v_referral_id := v_referral.id;

  -- Mark referral as completed
  UPDATE referrals
  SET status = 'completed',
      credits_awarded_referrer = p_credits_per_referral,
      credits_awarded_referred = p_credits_for_referred,
      completed_at = NOW()
  WHERE id = v_referral_id;

  -- Award credits to referrer (transaction + balance in one go)
  INSERT INTO credit_transactions (user_id, amount, type, description, referral_id)
  VALUES (v_referral.referrer_id, p_credits_per_referral, 'referral_bonus',
          'Referral bonus — your invite purchased a subscription', v_referral_id);

  INSERT INTO user_credits (user_id, balance, total_earned, updated_at)
  VALUES (v_referral.referrer_id, p_credits_per_referral, p_credits_per_referral, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + p_credits_per_referral,
      total_earned = user_credits.total_earned + p_credits_per_referral,
      updated_at = NOW();

  -- Award credits to referred user
  INSERT INTO credit_transactions (user_id, amount, type, description, referral_id)
  VALUES (p_referred_id, p_credits_for_referred, 'referred_bonus',
          'Welcome bonus from referral', v_referral_id);

  INSERT INTO user_credits (user_id, balance, total_earned, updated_at)
  VALUES (p_referred_id, p_credits_for_referred, p_credits_for_referred, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_credits.balance + p_credits_for_referred,
      total_earned = user_credits.total_earned + p_credits_for_referred,
      updated_at = NOW();

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Atomic function to create a referral signup with max_referrals enforcement.
-- Uses advisory lock on referrer_id to prevent TOCTOU on max_referrals check.
-- Returns: 'ok', 'inactive', 'invalid_code', 'self_referral', 'already_referred', 'max_reached', 'insert_failed'
CREATE OR REPLACE FUNCTION create_referral_signup(
  p_referred_id UUID,
  p_referral_code TEXT,
  p_max_referrals INTEGER  -- NULL means unlimited
) RETURNS TEXT AS $$
DECLARE
  v_code RECORD;
  v_existing UUID;
  v_count INTEGER;
BEGIN
  -- Look up the referral code
  SELECT id, user_id
  INTO v_code
  FROM referral_codes
  WHERE code = p_referral_code
    AND is_active = true;

  IF v_code IS NULL THEN
    RETURN 'invalid_code';
  END IF;

  -- Self-referral check
  IF v_code.user_id = p_referred_id THEN
    RETURN 'self_referral';
  END IF;

  -- Check if referred user already has a referral (UNIQUE constraint on referred_id covers this too)
  SELECT id INTO v_existing
  FROM referrals
  WHERE referred_id = p_referred_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN 'already_referred';
  END IF;

  -- Advisory lock on referrer to serialize max_referrals check + insert
  PERFORM pg_advisory_xact_lock(hashtext(v_code.user_id::text));

  -- Check max referrals if configured
  IF p_max_referrals IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM referrals
    WHERE referrer_id = v_code.user_id;

    IF v_count >= p_max_referrals THEN
      RETURN 'max_reached';
    END IF;
  END IF;

  -- Insert the pending referral
  INSERT INTO referrals (referrer_id, referred_id, referral_code_id, status)
  VALUES (v_code.user_id, p_referred_id, v_code.id, 'pending');

  RETURN 'ok';

EXCEPTION
  WHEN unique_violation THEN
    RETURN 'already_referred';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
