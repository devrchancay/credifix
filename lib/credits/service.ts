import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { CREDIT_DEFAULTS } from "./config";
import type { Tables } from "@/types/database";

type CreditConfig = Tables<"credit_config">;

// ─── Config Management ──────────────────────────────────────────────

export async function getCreditConfig(): Promise<CreditConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("credit_config")
    .select("*")
    .limit(1)
    .single();

  if (data) return data;

  const { data: created, error } = await supabase
    .from("credit_config")
    .insert({
      credit_value_cents: CREDIT_DEFAULTS.creditValueCents,
      max_discount_percentage: CREDIT_DEFAULTS.maxDiscountPercentage,
      is_redemption_active: CREDIT_DEFAULTS.isRedemptionActive,
    })
    .select()
    .single();

  if (error || !created) {
    const { data: retry } = await supabase
      .from("credit_config")
      .select("*")
      .limit(1)
      .single();
    if (retry) return retry;
    throw new Error("Failed to initialize credit config");
  }

  return created;
}

export async function updateCreditConfig(
  updates: Partial<Pick<CreditConfig, "credit_value_cents" | "max_discount_percentage" | "is_redemption_active">>
): Promise<CreditConfig> {
  const supabase = createAdminClient();
  const config = await getCreditConfig();

  const { data, error } = await supabase
    .from("credit_config")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", config.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update credit config: ${error?.message}`);
  }

  return data;
}

// ─── Redemption Preview ─────────────────────────────────────────────

export interface RedemptionPreview {
  balance: number;
  creditValueCents: number;
  balanceValueCents: number; // balance × creditValueCents
  subscriptionPriceCents: number; // current subscription price in cents
  maxDiscountCents: number; // subscription price × max %
  maxRedeemableCredits: number; // max credits that can be redeemed
  maxRedeemableValueCents: number; // dollar value of max redeemable
  isRedemptionActive: boolean;
  hasActiveSubscription: boolean;
}

export async function getRedemptionPreview(userId: string): Promise<RedemptionPreview> {
  const supabase = createAdminClient();

  const [config, credits, subscription] = await Promise.all([
    getCreditConfig(),
    supabase.from("user_credits").select("*").eq("user_id", userId).single(),
    supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .single(),
  ]);

  const balance = credits.data?.balance ?? 0;
  const hasActiveSubscription = !!subscription.data;

  // Get subscription price from Stripe for accuracy
  let subscriptionPriceCents = 0;
  if (subscription.data?.stripe_price_id) {
    try {
      const price = await stripe.prices.retrieve(subscription.data.stripe_price_id);
      subscriptionPriceCents = price.unit_amount ?? 0;
    } catch {
      // Fallback to plan price from DB
      const plan = subscription.data.plans as Tables<"plans"> | null;
      if (plan) {
        subscriptionPriceCents = subscription.data.stripe_price_id === plan.stripe_yearly_price_id
          ? plan.price_yearly
          : plan.price_monthly;
      }
    }
  }

  const maxDiscountCents = Math.floor(
    subscriptionPriceCents * (config.max_discount_percentage / 100)
  );

  // Max credits the user can redeem = min(balance, credits needed for max discount)
  const creditsForMaxDiscount = config.credit_value_cents > 0
    ? Math.floor(maxDiscountCents / config.credit_value_cents)
    : 0;
  const maxRedeemableCredits = Math.min(balance, creditsForMaxDiscount);
  const maxRedeemableValueCents = maxRedeemableCredits * config.credit_value_cents;

  return {
    balance,
    creditValueCents: config.credit_value_cents,
    balanceValueCents: balance * config.credit_value_cents,
    subscriptionPriceCents,
    maxDiscountCents,
    maxRedeemableCredits,
    maxRedeemableValueCents,
    isRedemptionActive: config.is_redemption_active,
    hasActiveSubscription,
  };
}

// ─── Credit Redemption ──────────────────────────────────────────────

export interface RedemptionResult {
  success: boolean;
  creditsRedeemed: number;
  discountCents: number;
  remainingBalance: number;
  message: string;
}

export async function redeemCredits(
  userId: string,
  credits: number
): Promise<RedemptionResult> {
  const supabase = createAdminClient();

  // Validate input
  if (!Number.isInteger(credits) || credits <= 0) {
    return { success: false, creditsRedeemed: 0, discountCents: 0, remainingBalance: 0, message: "Invalid credit amount" };
  }

  // Get config and preview
  const preview = await getRedemptionPreview(userId);

  if (!preview.isRedemptionActive) {
    return { success: false, creditsRedeemed: 0, discountCents: 0, remainingBalance: preview.balance, message: "Credit redemption is currently disabled" };
  }

  if (!preview.hasActiveSubscription) {
    return { success: false, creditsRedeemed: 0, discountCents: 0, remainingBalance: preview.balance, message: "No active subscription found" };
  }

  if (credits > preview.balance) {
    return { success: false, creditsRedeemed: 0, discountCents: 0, remainingBalance: preview.balance, message: "Insufficient credit balance" };
  }

  if (credits > preview.maxRedeemableCredits) {
    return { success: false, creditsRedeemed: 0, discountCents: 0, remainingBalance: preview.balance, message: `Maximum redeemable credits is ${preview.maxRedeemableCredits}` };
  }

  const discountCents = credits * preview.creditValueCents;

  // 1. Atomic spend in DB
  const { data: spent } = await supabase.rpc("spend_user_credits", {
    p_user_id: userId,
    p_amount: credits,
  });

  if (!spent) {
    return { success: false, creditsRedeemed: 0, discountCents: 0, remainingBalance: preview.balance, message: "Failed to deduct credits — insufficient balance" };
  }

  // 2. Record transaction
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: -credits,
    type: "usage" as const,
    description: `Redeemed ${credits} credits for $${(discountCents / 100).toFixed(2)} subscription discount`,
  });

  // 3. Apply to Stripe customer balance
  try {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .single();

    if (subscription?.stripe_customer_id) {
      await stripe.customers.createBalanceTransaction(
        subscription.stripe_customer_id,
        {
          amount: -discountCents, // negative = credit to customer
          currency: "usd",
          description: `Credit redemption: ${credits} credits`,
          metadata: {
            type: "credit_redemption",
            credits_redeemed: String(credits),
            user_id: userId,
          },
        }
      );
    }
  } catch (err) {
    console.error("Stripe balance transaction failed after credit spend:", err);
    // Credits already deducted from DB — log for manual reconciliation
  }

  const remainingBalance = preview.balance - credits;

  return {
    success: true,
    creditsRedeemed: credits,
    discountCents,
    remainingBalance,
    message: `Successfully redeemed ${credits} credits for $${(discountCents / 100).toFixed(2)} discount`,
  };
}
