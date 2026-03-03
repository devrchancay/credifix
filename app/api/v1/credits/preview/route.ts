import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { getRedemptionPreview } from "@/lib/credits/service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const preview = await getRedemptionPreview(authResult.userId);
    return NextResponse.json(preview);
  } catch (error) {
    return handleApiError(error);
  }
}
