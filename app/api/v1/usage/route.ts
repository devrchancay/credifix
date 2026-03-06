import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getUsageCounts } from "@/lib/api/usage-limits";

/** Get current daily usage for the authenticated user. */
export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const rateLimitResponse = await checkRateLimit("public", authResult.userId);
    if (rateLimitResponse) return rateLimitResponse;

    const usage = await getUsageCounts(authResult.userId);

    return NextResponse.json(usage);
  } catch (error) {
    return handleApiError(error);
  }
}
