import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { createErrorResponse, handleApiError, ErrorCodes } from "@/lib/api/errors";
import { processReferralSignup } from "@/lib/referral/service";

export async function POST(request: NextRequest) {
  try {
    console.log("[REFERRAL REGISTER] Endpoint hit");

    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      console.log("[REFERRAL REGISTER] No auth - unauthorized");
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }
    console.log("[REFERRAL REGISTER] User authenticated:", authResult.userId);

    const body = await request.json().catch(() => ({}));
    const code = body.code as string | undefined;
    console.log("[REFERRAL REGISTER] Body received:", JSON.stringify(body));
    console.log("[REFERRAL REGISTER] Code:", code);

    if (!code) {
      console.log("[REFERRAL REGISTER] No code in body, skipping");
      return NextResponse.json({ registered: false, message: "No referral code" });
    }

    console.log("[REFERRAL REGISTER] Processing referral for user:", authResult.userId, "with code:", code);
    const result = await processReferralSignup(authResult.userId, code);
    console.log("[REFERRAL REGISTER] Result:", JSON.stringify(result));

    return NextResponse.json({ registered: result.success, message: result.message });
  } catch (error) {
    console.error("[REFERRAL REGISTER] Error:", error);
    return handleApiError(error);
  }
}
