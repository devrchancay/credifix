import { NextRequest, NextResponse } from "next/server";
import { handleApiError, createErrorResponse, ErrorCodes } from "@/lib/api/errors";
import { validateReferralCode } from "@/lib/referral/service";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return createErrorResponse("Missing code parameter", 400, ErrorCodes.VALIDATION_ERROR);
    }

    const result = await validateReferralCode(code);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
