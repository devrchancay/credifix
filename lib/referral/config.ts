export const REFERRAL_DEFAULTS = {
  creditsPerReferral: 10,
  creditsForReferred: 10,
  maxReferralsPerUser: null as number | null,
  codeLength: 8,
} as const;

export const REFERRAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
