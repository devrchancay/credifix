import { REFERRAL_CODE_CHARS, REFERRAL_DEFAULTS } from "./config";

export function generateReferralCode(
  length: number = REFERRAL_DEFAULTS.codeLength
): string {
  let code = "";
  const chars = REFERRAL_CODE_CHARS;
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
