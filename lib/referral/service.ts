import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { generateReferralCode } from "./generate-code";
import { REFERRAL_DEFAULTS } from "./config";
import type { Tables } from "@/types/database";

type ReferralConfig = Tables<"referral_config">;

export async function getReferralConfig(): Promise<ReferralConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("referral_config")
    .select("*")
    .limit(1)
    .single();

  if (data) {
    return data;
  }

  const { data: created, error: insertError } = await supabase
    .from("referral_config")
    .insert({
      credits_per_referral: REFERRAL_DEFAULTS.creditsPerReferral,
      credits_for_referred: REFERRAL_DEFAULTS.creditsForReferred,
      is_active: true,
      require_subscription: false,
    })
    .select()
    .single();

  if (insertError || !created) {
    const { data: retry } = await supabase
      .from("referral_config")
      .select("*")
      .limit(1)
      .single();

    if (retry) return retry;
    throw new Error("Failed to initialize referral config");
  }

  return created;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return existing.code;
  }

  let code: string;
  let attempts = 0;
  do {
    code = generateReferralCode();
    const { error } = await supabase.from("referral_codes").insert({
      user_id: userId,
      code,
    });

    if (!error) return code;

    if (error.code === "23505" && error.message.includes("referral_codes_code_key")) {
      attempts++;
      continue;
    }

    if (error.code === "23505") {
      const { data: raceResult } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", userId)
        .single();
      if (raceResult) return raceResult.code;
    }

    throw new Error(`Failed to create referral code: ${error.message}`);
  } while (attempts < 5);

  throw new Error("Failed to generate unique referral code");
}

export async function getReferralStats(userId: string) {
  const supabase = createAdminClient();

  const [
    { data: referralCode },
    { data: referrals },
    { data: credits },
  ] = await Promise.all([
    supabase
      .from("referral_codes")
      .select("*")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("referrals")
      .select("*, referred:profiles!referrals_referred_id_fkey(email, full_name)")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", userId)
      .single(),
  ]);

  return {
    code: referralCode?.code ?? null,
    totalReferrals: referrals?.length ?? 0,
    completedReferrals: referrals?.filter((r) => r.status === "completed").length ?? 0,
    pendingReferrals: referrals?.filter((r) => r.status === "pending").length ?? 0,
    referrals: referrals ?? [],
    credits: {
      balance: credits?.balance ?? 0,
      totalEarned: credits?.total_earned ?? 0,
      totalSpent: credits?.total_spent ?? 0,
    },
  };
}

/**
 * Called during user signup (via referral register endpoint).
 * Creates a PENDING referral record. No credits yet.
 */
export async function processReferralSignup(
  referredUserId: string,
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();

  const config = await getReferralConfig();
  if (!config.is_active) {
    return { success: false, message: "Referral program is not active" };
  }

  const { data: codeData } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("code", referralCode)
    .eq("is_active", true)
    .single();

  if (!codeData) {
    return { success: false, message: "Invalid referral code" };
  }

  if (codeData.user_id === referredUserId) {
    return { success: false, message: "Cannot use your own referral code" };
  }

  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", referredUserId)
    .single();

  if (existingReferral) {
    return { success: false, message: "User already has a referral" };
  }

  if (config.max_referrals_per_user) {
    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", codeData.user_id);

    if (count !== null && count >= config.max_referrals_per_user) {
      return { success: false, message: "Referrer has reached maximum referrals" };
    }
  }

  // Create referral as PENDING — credits awarded when referred user subscribes
  const { error: referralError } = await supabase
    .from("referrals")
    .insert({
      referrer_id: codeData.user_id,
      referred_id: referredUserId,
      referral_code_id: codeData.id,
      status: "pending",
    });

  if (referralError) {
    return { success: false, message: "Failed to create referral" };
  }

  return { success: true, message: "Referral registered, pending subscription" };
}

/**
 * Called from Stripe webhook on checkout.session.completed.
 * Completes a pending referral and awards credits to both users.
 */
export async function completeReferralOnSubscription(
  referredUserId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Find pending referral for this user
  const { data: referral } = await supabase
    .from("referrals")
    .select("*")
    .eq("referred_id", referredUserId)
    .eq("status", "pending")
    .single();

  if (!referral) {
    return; // No pending referral, nothing to do
  }

  const config = await getReferralConfig();
  if (!config.is_active) {
    return;
  }

  // Mark referral as completed
  await supabase
    .from("referrals")
    .update({
      status: "completed",
      credits_awarded_referrer: config.credits_per_referral,
      credits_awarded_referred: config.credits_for_referred,
      completed_at: new Date().toISOString(),
    })
    .eq("id", referral.id);

  // Award credits to both users via Stripe + DB
  await Promise.all([
    awardCredits(
      referral.referrer_id,
      config.credits_per_referral,
      "referral_bonus",
      "Referral bonus — your invite purchased a subscription",
      referral.id
    ),
    awardCredits(
      referredUserId,
      config.credits_for_referred,
      "referred_bonus",
      "Welcome bonus from referral",
      referral.id
    ),
  ]);

  console.log("Referral completed:", {
    referralId: referral.id,
    referrer: referral.referrer_id,
    referred: referredUserId,
  });
}

/**
 * Finds or creates a Stripe customer for a user.
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  const existingCustomers = await stripe.customers.search({
    query: `metadata["user_id"]:"${userId}"`,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  const customer = await stripe.customers.create({
    email: profile?.email ?? undefined,
    name: profile?.full_name ?? undefined,
    metadata: { user_id: userId },
  });

  return customer.id;
}

/**
 * Awards credits to a user:
 * 1. Adds credit to Stripe Customer Balance (negative amount = credit)
 * 2. Records transaction in Supabase
 * 3. Updates user_credits balance
 */
async function awardCredits(
  userId: string,
  amount: number,
  type: "referral_bonus" | "referred_bonus",
  description: string,
  referralId: string
) {
  const supabase = createAdminClient();

  const stripeCustomerId = await getOrCreateStripeCustomer(userId);
  const balanceTransaction = await stripe.customers.createBalanceTransaction(
    stripeCustomerId,
    {
      amount: -amount * 100, // cents, negative = credit
      currency: "usd",
      description,
      metadata: {
        type,
        referral_id: referralId,
        user_id: userId,
      },
    }
  );

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
    referral_id: referralId,
    stripe_payment_intent_id: balanceTransaction.id,
  });

  const { data: existing } = await supabase
    .from("user_credits")
    .select("balance, total_earned")
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase
      .from("user_credits")
      .update({
        balance: existing.balance + amount,
        total_earned: existing.total_earned + amount,
      })
      .eq("user_id", userId);
  } else {
    await supabase.from("user_credits").insert({
      user_id: userId,
      balance: amount,
      total_earned: amount,
    });
  }
}

export async function validateReferralCode(
  code: string
): Promise<{ valid: boolean; referrerName?: string }> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("referral_codes")
    .select("user_id, profiles!referral_codes_user_id_fkey(full_name)")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  if (!data) {
    return { valid: false };
  }

  const profile = data.profiles as unknown as { full_name: string | null } | null;
  return {
    valid: true,
    referrerName: profile?.full_name ?? undefined,
  };
}
