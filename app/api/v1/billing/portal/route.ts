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

    // Get customer ID from subscription
    const supabase = createAdminClient();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (!subscription?.stripe_customer_id) {
      return createErrorResponse(
        "No active subscription found",
        404,
        ErrorCodes.NOT_FOUND
      );
    }

    // Determine return URL
    const finalReturnUrl =
      returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/billing`;

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
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
