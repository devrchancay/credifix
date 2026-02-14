import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { generateReferralCode } from "./generate-code";
import type { Tables } from "@/types/database";

type ReferralConfig = Tables<"referral_config">;

export async function getReferralConfig(): Promise<ReferralConfig> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("referral_config")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("Referral config not found");
  }

  return data;
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

export async function processReferralSignup(
  referredUserId: string,
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();

  // 1. Get the referral config
  const config = await getReferralConfig();
  if (!config.is_active) {
    return { success: false, message: "Referral program is not active" };
  }

  // 2. Find the referral code
  const { data: codeData } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("code", referralCode)
    .eq("is_active", true)
    .single();

  if (!codeData) {
    return { success: false, message: "Invalid referral code" };
  }

  // 3. Don't allow self-referral
  if (codeData.user_id === referredUserId) {
    return { success: false, message: "Cannot use your own referral code" };
  }

  // 4. Check if the referred user already has a referral
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", referredUserId)
    .single();

  if (existingReferral) {
    return { success: false, message: "User already has a referral" };
  }

  // 5. Check max referrals per user
  if (config.max_referrals_per_user) {
    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", codeData.user_id);

    if (count !== null && count >= config.max_referrals_per_user) {
      return { success: false, message: "Referrer has reached maximum referrals" };
    }
  }

  // 6. Create the referral record
  const { data: referral, error: referralError } = await supabase
    .from("referrals")
    .insert({
      referrer_id: codeData.user_id,
      referred_id: referredUserId,
      referral_code_id: codeData.id,
      status: "completed",
      credits_awarded_referrer: config.credits_per_referral,
      credits_awarded_referred: config.credits_for_referred,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (referralError || !referral) {
    return { success: false, message: "Failed to create referral" };
  }

  // 7. Award credits to both users (Stripe + DB)
  await Promise.all([
    awardCredits(
      codeData.user_id,
      config.credits_per_referral,
      "referral_bonus",
      "Referral bonus for inviting a new user",
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

  return { success: true, message: "Referral processed successfully" };
}

/**
 * Finds or creates a Stripe customer for a user.
 * Looks up existing customer from subscriptions first, then creates one if needed.
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const supabase = createAdminClient();

  // Check if user already has a Stripe customer via subscriptions
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // Search Stripe by metadata
  const existingCustomers = await stripe.customers.search({
    query: `metadata["clerk_user_id"]:"${userId}"`,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create a new Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  const customer = await stripe.customers.create({
    email: profile?.email ?? undefined,
    name: profile?.full_name ?? undefined,
    metadata: { clerk_user_id: userId },
  });

  return customer.id;
}

/**
 * Awards credits to a user:
 * 1. Adds a negative balance to Stripe Customer (negative = credit in Stripe)
 * 2. Records the transaction in Supabase
 * 3. Updates the user_credits balance in Supabase
 */
async function awardCredits(
  userId: string,
  amount: number,
  type: "referral_bonus" | "referred_bonus",
  description: string,
  referralId: string
) {
  const supabase = createAdminClient();

  // 1. Apply credit to Stripe Customer Balance
  //    In Stripe, negative balance = credit for the customer
  const stripeCustomerId = await getOrCreateStripeCustomer(userId);
  const balanceTransaction = await stripe.customers.createBalanceTransaction(
    stripeCustomerId,
    {
      amount: -amount * 100, // Convert to cents, negative = credit
      currency: "usd",
      description,
      metadata: {
        type,
        referral_id: referralId,
        user_id: userId,
      },
    }
  );

  // 2. Record transaction in Supabase
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
    referral_id: referralId,
    stripe_payment_intent_id: balanceTransaction.id,
  });

  // 3. Update user credits balance
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
