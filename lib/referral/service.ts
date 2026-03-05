import { createAdminClient } from "@/lib/supabase/admin";
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
 * Creates a PENDING referral record atomically via DB function.
 * Prevents TOCTOU on max_referrals and duplicate referrals.
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

  const { data: result, error } = await supabase.rpc("create_referral_signup", {
    p_referred_id: referredUserId,
    p_referral_code: referralCode,
    p_max_referrals: config.max_referrals_per_user ?? null,
  });

  if (error) {
    return { success: false, message: "Failed to create referral" };
  }

  const messages: Record<string, string> = {
    ok: "Referral registered, pending subscription",
    invalid_code: "Invalid referral code",
    self_referral: "Cannot use your own referral code",
    already_referred: "User already has a referral",
    max_reached: "Referrer has reached maximum referrals",
    insert_failed: "Failed to create referral",
  };

  const status = result as string;
  return {
    success: status === "ok",
    message: messages[status] || "Failed to create referral",
  };
}

/**
 * Called from Stripe webhook on checkout.session.completed.
 * Completes a pending referral and awards credits to both users
 * in a single atomic DB transaction to prevent double-award race conditions.
 */
export async function completeReferralOnSubscription(
  referredUserId: string
): Promise<void> {
  const supabase = createAdminClient();

  const config = await getReferralConfig();
  if (!config.is_active) {
    return;
  }

  const { data: referralId } = await supabase.rpc(
    "complete_referral_and_award_credits",
    {
      p_referred_id: referredUserId,
      p_credits_per_referral: config.credits_per_referral,
      p_credits_for_referred: config.credits_for_referred,
    }
  );

  if (!referralId) {
    return; // No pending referral found (or already completed)
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
