import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";
import { createCheckoutSchema } from "@/lib/api/validation";
import { stripe } from "@/lib/stripe/client";
import { getPlanBySlug } from "@/lib/plans/service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateCheckoutResponse } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }
    const { userId } = authResult;

    // Get user details
    const user = await currentUser();
    if (!user) {
      return createErrorResponse("User not found", 404, ErrorCodes.NOT_FOUND);
    }

    // Parse and validate request
    const body = await request.json();
    const result = createCheckoutSchema.safeParse(body);
    if (!result.success) {
      return createErrorResponse(
        result.error.issues[0]?.message || "Invalid request",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const { plan: planSlug, interval, successUrl, cancelUrl, platform } = result.data;

    // Fetch plan from DB
    const plan = await getPlanBySlug(planSlug);
    if (!plan) {
      return createErrorResponse(
        "Plan not found",
        404,
        ErrorCodes.NOT_FOUND
      );
    }

    // Determine price ID based on interval
    const priceId =
      interval === "monthly"
        ? plan.stripe_monthly_price_id
        : plan.stripe_yearly_price_id;

    if (!priceId) {
      return createErrorResponse(
        "Price not configured for this plan/interval",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check for existing customer
    const supabase = createAdminClient();
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    // Determine redirect URLs based on platform
    const finalSuccessUrl =
      platform === "mobile" && successUrl
        ? successUrl
        : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`;

    const finalCancelUrl =
      platform === "mobile" && cancelUrl
        ? cancelUrl
        : `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: existingSubscription?.stripe_customer_id ?? undefined,
      customer_email: existingSubscription
        ? undefined
        : user.emailAddresses[0]?.emailAddress,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: { userId, planId: plan.id },
      subscription_data: { metadata: { userId, planId: plan.id } },
    });

    if (!session.url) {
      return createErrorResponse(
        "Failed to create checkout session",
        500,
        ErrorCodes.STRIPE_ERROR
      );
    }

    const response: CreateCheckoutResponse = {
      checkoutUrl: session.url,
      sessionId: session.id,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
