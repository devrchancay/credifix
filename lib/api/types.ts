import type { PlanName, BillingInterval } from "@/lib/stripe/config";

// Subscription status from database
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid"
  | "paused";

// Platform identifier
export type Platform = "web" | "mobile";

// ============================================
// Billing: Checkout
// ============================================

export interface CreateCheckoutRequest {
  plan: Exclude<PlanName, "free">;
  interval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
  platform?: Platform;
}

export interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

// ============================================
// Billing: Portal
// ============================================

export interface CreatePortalRequest {
  returnUrl?: string;
  configuration?: string;
}

export interface CreatePortalResponse {
  portalUrl: string;
}

// ============================================
// Billing: Subscription
// ============================================

export interface SubscriptionData {
  id: string;
  status: SubscriptionStatus;
  plan: PlanName;
  stripePriceId: string;
  stripeCustomerId: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface GetSubscriptionResponse {
  subscription: SubscriptionData | null;
}

// ============================================
// Error Response
// ============================================

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
