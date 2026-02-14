import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { processReferralSignup } from "@/lib/referral/service";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const body = await request.json().catch(() => ({}));
    const code = body.code as string | undefined;

    if (!code) {
      return NextResponse.json({ registered: false, message: "No referral code" });
    }

    const result = await processReferralSignup(authResult.userId, code);

    return NextResponse.json({ registered: result.success, message: result.message });
  } catch (error) {
    return handleApiError(error);
  }
}
