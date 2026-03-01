import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { getPlanByPriceId } from "@/lib/plans/service";
import type Stripe from "stripe";

export async function POST() {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    // Iterate through all active/trialing/past_due subscriptions in Stripe
    for await (const sub of stripe.subscriptions.list({
      status: "active",
      expand: ["data.customer"],
    })) {
      await syncSubscription(sub, supabase, { errors });
      synced++;
    }

    for await (const sub of stripe.subscriptions.list({
      status: "trialing",
      expand: ["data.customer"],
    })) {
      await syncSubscription(sub, supabase, { errors });
      synced++;
    }

    for await (const sub of stripe.subscriptions.list({
      status: "past_due",
      expand: ["data.customer"],
    })) {
      await syncSubscription(sub, supabase, { errors });
      synced++;
    }

    return NextResponse.json({
      message: `Sync complete: ${synced - errors.length} synced, ${errors.length} failed`,
      synced: synced - errors.length,
      failed: errors.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function syncSubscription(
  sub: Stripe.Subscription,
  supabase: ReturnType<typeof createAdminClient>,
  ctx: { errors: string[] }
) {
  try {
    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId) {
      ctx.errors.push(`${sub.id}: no price found`);
      return;
    }

    // Resolve userId from: subscription metadata → customer metadata → DB lookup
    let userId: string | undefined;

    // 1. Check subscription metadata
    userId = sub.metadata?.userId;

    // 2. Check customer metadata
    if (!userId) {
      const customer = sub.customer;
      if (typeof customer === "object" && customer && !("deleted" in customer && customer.deleted)) {
        userId = (customer as Stripe.Customer).metadata?.user_id;
      }
    }

    // 3. Look up by stripe_customer_id in existing subscriptions
    if (!userId) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .limit(1)
        .single();
      userId = existing?.user_id ?? undefined;
    }

    // 4. Look up by customer email in profiles
    if (!userId) {
      const customer = typeof sub.customer === "string"
        ? await stripe.customers.retrieve(sub.customer)
        : sub.customer;

      if (customer && !("deleted" in customer && customer.deleted)) {
        const email = (customer as Stripe.Customer).email;
        if (email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();
          userId = profile?.id;
        }
      }
    }

    if (!userId) {
      ctx.errors.push(`${sub.id}: could not resolve userId`);
      return;
    }

    // Resolve plan
    const plan = await getPlanByPriceId(priceId);
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    // In Stripe API 2026-01-28, period dates are on subscription items
    const item = sub.items.data[0];
    const periodStart = item?.current_period_start;
    const periodEnd = item?.current_period_end;

    await supabase.from("subscriptions").upsert({
      id: sub.id,
      user_id: userId,
      plan_id: plan?.id ?? null,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      status: sub.status as "active" | "trialing" | "past_due",
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    });
  } catch (err) {
    ctx.errors.push(`${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
