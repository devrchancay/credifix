import { NextRequest, NextResponse } from "next/server";
import { validateReferralCode } from "@/lib/referral/service";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const locale = request.nextUrl.searchParams.get("locale") || "en";

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/sign-up`, request.url));
  }

  const validation = await validateReferralCode(code);
  if (!validation.valid) {
    return NextResponse.redirect(new URL(`/${locale}/sign-up`, request.url));
  }

  const response = NextResponse.redirect(
    new URL(`/${locale}/sign-up`, request.url)
  );

  response.cookies.set("referral_code", code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}
