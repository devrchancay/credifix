import { NextRequest, NextResponse } from "next/server";
import { handleApiError, createErrorResponse, ErrorCodes } from "@/lib/api/errors";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { validateReferralCode } from "@/lib/referral/service";

// Only allow alphanumeric codes with reasonable length
const CODE_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;

export async function GET(request: NextRequest) {
  try {
    // Rate limit by IP (public endpoint)
    const rateLimited = await checkRateLimit("public", getClientIp(request));
    if (rateLimited) return rateLimited;

    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return createErrorResponse("Missing code parameter", 400, ErrorCodes.VALIDATION_ERROR);
    }

    if (!CODE_PATTERN.test(code)) {
      return createErrorResponse("Invalid code format", 400, ErrorCodes.VALIDATION_ERROR);
    }

    const result = await validateReferralCode(code);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
