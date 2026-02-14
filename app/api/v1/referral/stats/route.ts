import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { getReferralStats, getReferralConfig } from "@/lib/referral/service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const [stats, config] = await Promise.all([
      getReferralStats(authResult.userId),
      getReferralConfig(),
    ]);

    return NextResponse.json({
      ...stats,
      config: {
        creditsPerReferral: config.credits_per_referral,
        creditsForReferred: config.credits_for_referred,
        maxReferralsPerUser: config.max_referrals_per_user,
        isActive: config.is_active,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
