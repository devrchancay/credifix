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

    const cookieStore = await cookies();
    const code = cookieStore.get("referral_code")?.value;

    console.log("[REFERRAL REGISTER] userId:", authResult.userId, "cookie:", code);

    if (!code) {
      return NextResponse.json({ registered: false, message: "No referral code" });
    }

    const result = await processReferralSignup(authResult.userId, code);
    console.log("[REFERRAL REGISTER] Result:", JSON.stringify(result));

    // Clear cookie after processing
    cookieStore.delete("referral_code");

    return NextResponse.json({ registered: result.success, message: result.message });
  } catch (error) {
    console.error("[REFERRAL REGISTER] Error:", error);
    return handleApiError(error);
  }
}
