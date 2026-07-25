/**
 * Public contact points. Set these per deployment so the UI never shows an
 * address that nobody reads.
 */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@packex.app";

export const BILLING_EMAIL =
  process.env.NEXT_PUBLIC_BILLING_EMAIL?.trim() || SUPPORT_EMAIL;

export const PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || SUPPORT_EMAIL;

export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "PackEX";
