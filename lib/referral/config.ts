export const REFERRAL_DEFAULTS = {
  creditsPerReferral: 15,
  creditsForReferred: 15,
  maxReferralsPerUser: null as number | null,
  codeLength: 8,
} as const;

export const REFERRAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
