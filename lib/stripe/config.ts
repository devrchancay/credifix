export const PLANS = {
  free: {
    name: "Free",
    description: "For individuals getting started",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      "Up to 3 projects",
      "Basic analytics",
      "Community support",
      "1 team member",
    ],
    limits: {
      projects: 3,
      members: 1,
    },
  },
  pro: {
    name: "Pro",
    description: "For professionals and small teams",
    price: {
      monthly: 19,
      yearly: 190,
    },
    priceId: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
    },
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Up to 10 team members",
      "Custom integrations",
      "API access",
    ],
    limits: {
      projects: -1, // unlimited
      members: 10,
    },
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations",
    price: {
      monthly: 99,
      yearly: 990,
    },
    priceId: {
      monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!,
      yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!,
    },
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Dedicated support",
      "SLA guarantee",
      "SSO/SAML",
      "Custom contracts",
    ],
    limits: {
      projects: -1,
      members: -1,
    },
  },
} as const;

export type PlanName = keyof typeof PLANS;
export type BillingInterval = "monthly" | "yearly";

export function getPlanByPriceId(priceId: string): PlanName | null {
  for (const [planName, plan] of Object.entries(PLANS)) {
    if ("priceId" in plan) {
      if (plan.priceId.monthly === priceId || plan.priceId.yearly === priceId) {
        return planName as PlanName;
      }
    }
  }
  return null;
}
