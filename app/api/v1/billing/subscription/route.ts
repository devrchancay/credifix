import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanByPriceId } from "@/lib/plans/service";
import type { GetSubscriptionResponse, SubscriptionData } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }
    const { userId } = authResult;

    // Get subscription from database with plan join
    const supabase = createAdminClient();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*, plans(slug)")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let subscriptionData: SubscriptionData | null = null;

    if (subscription) {
      // Use joined plan slug, fallback to lookup by price ID
      let planSlug: string = "free";
      const plans = subscription.plans as { slug: string } | null;
      if (plans?.slug) {
        planSlug = plans.slug;
      } else {
        const plan = await getPlanByPriceId(subscription.stripe_price_id);
        planSlug = plan?.slug ?? "free";
      }

      subscriptionData = {
        id: subscription.id,
        status: subscription.status,
        plan: planSlug,
        stripePriceId: subscription.stripe_price_id,
        stripeCustomerId: subscription.stripe_customer_id,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    }

    const response: GetSubscriptionResponse = {
      subscription: subscriptionData,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
