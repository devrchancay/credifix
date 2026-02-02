import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanByPriceId } from "@/lib/stripe/config";
import type { GetSubscriptionResponse, SubscriptionData } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }
    const { userId } = authResult;

    // Get subscription from database
    const supabase = createAdminClient();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let subscriptionData: SubscriptionData | null = null;

    if (subscription) {
      const plan = getPlanByPriceId(subscription.stripe_price_id) ?? "free";

      subscriptionData = {
        id: subscription.id,
        status: subscription.status,
        plan,
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
