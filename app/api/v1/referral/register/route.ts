import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { processReferralSignup } from "@/lib/referral/service";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    // Read referral code from cookie
    const cookieStore = await cookies();
    const referralCode = cookieStore.get("referral_code")?.value;

    if (!referralCode) {
      return NextResponse.json({ registered: false, message: "No referral code" });
    }

    // Process the referral (creates pending record)
    const result = await processReferralSignup(authResult.userId, referralCode);

    // Clear the cookie regardless of result
    cookieStore.delete("referral_code");

    return NextResponse.json({ registered: result.success, message: result.message });
  } catch (error) {
    return handleApiError(error);
  }
}
