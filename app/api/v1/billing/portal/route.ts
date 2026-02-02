import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";
import { createPortalSchema } from "@/lib/api/validation";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreatePortalResponse } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }
    const { userId } = authResult;

    // Parse and validate request (body may be empty)
    const body = await request.json().catch(() => ({}));
    const result = createPortalSchema.safeParse(body);
    if (!result.success) {
      return createErrorResponse(
        result.error.issues[0]?.message || "Invalid request",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const { returnUrl, configuration } = result.data;
    const supabase = createAdminClient();

    // Try to get existing customer ID from subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let stripeCustomerId = subscription?.stripe_customer_id;

    // If no subscription exists, create a new Stripe customer
    if (!stripeCustomerId) {
      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (!profile?.email) {
        return createErrorResponse(
          "User profile not found. Please complete your registration.",
          404,
          ErrorCodes.NOT_FOUND
        );
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: {
          clerk_user_id: userId,
        },
      });

      stripeCustomerId = customer.id;
    }

    // Determine return URL
    const finalReturnUrl =
      returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/billing`;

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: finalReturnUrl,
      ...(configuration && { configuration }),
    });

    const response: CreatePortalResponse = {
      portalUrl: session.url,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
