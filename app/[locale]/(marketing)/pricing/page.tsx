"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { usePortal } from "@/hooks/use-portal";

const plans = [
  {
    name: "Free",
    description: "For individuals getting started",
    price: "$0",
    interval: "forever",
    features: [
      "Up to 3 projects",
      "Basic analytics",
      "Community support",
      "1 team member",
    ],
    cta: "Get Started",
    href: "/sign-up",
    popular: false,
    usePortal: false,
  },
  {
    name: "Pro",
    description: "For professionals and small teams",
    price: "$19",
    interval: "per month",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Up to 10 team members",
      "Custom integrations",
      "API access",
    ],
    cta: "Subscribe",
    href: null,
    popular: true,
    usePortal: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    price: "$99",
    interval: "per month",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Dedicated support",
      "SLA guarantee",
      "SSO/SAML",
      "Custom contracts",
    ],
    cta: "Subscribe",
    href: null,
    popular: false,
    usePortal: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { openPortal, isLoading, isSignedIn } = usePortal();

  const handlePlanClick = async (plan: (typeof plans)[number]) => {
    if (plan.href) {
      router.push(plan.href);
      return;
    }

    if (plan.usePortal) {
      if (!isSignedIn) {
        router.push("/sign-in?redirect_url=/pricing");
        return;
      }
      await openPortal(window.location.href);
    }
  };

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that works best for you. All plans include a 14-day
          free trial.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? "border-primary shadow-lg" : ""}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.popular && <Badge>Popular</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handlePlanClick(plan)}
                disabled={isLoading && plan.usePortal}
              >
                {isLoading && plan.usePortal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  plan.cta
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
