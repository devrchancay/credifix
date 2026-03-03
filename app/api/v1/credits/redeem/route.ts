import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { redeemCredits } from "@/lib/credits/service";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const body = await request.json();
    const credits = body.credits;

    if (typeof credits !== "number" || !Number.isInteger(credits) || credits <= 0) {
      return createErrorResponse(
        "Credits must be a positive integer",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const result = await redeemCredits(authResult.userId, credits);

    if (!result.success) {
      return createErrorResponse(result.message, 400, ErrorCodes.VALIDATION_ERROR);
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
