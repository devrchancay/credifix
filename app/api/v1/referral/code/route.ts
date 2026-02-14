import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { getOrCreateReferralCode } from "@/lib/referral/service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const code = await getOrCreateReferralCode(authResult.userId);
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${code}`;

    return NextResponse.json({ code, inviteUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
