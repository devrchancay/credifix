import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_credits")
      .select("auto_redeem")
      .eq("user_id", authResult.userId)
      .single();

    return NextResponse.json({ autoRedeem: data?.auto_redeem ?? false });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return createErrorResponse(
        "enabled must be a boolean",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_credits")
      .upsert(
        { user_id: authResult.userId, auto_redeem: enabled },
        { onConflict: "user_id" }
      );

    if (error) {
      return createErrorResponse("Failed to update auto-redeem setting", 500);
    }

    return NextResponse.json({ autoRedeem: enabled });
  } catch (error) {
    return handleApiError(error);
  }
}
