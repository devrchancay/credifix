"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
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
import { createApiClient } from "@/lib/api/client";
import type { PlanData } from "@/lib/api/types";

type IntervalType = "monthly" | "yearly";

const apiClient = createApiClient();

export default function PricingPage() {
	const router = useRouter();
	const { isSignedIn } = useAuth();
	const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
	const [interval] = useState<IntervalType>("monthly");
	const [plans, setPlans] = useState<PlanData[]>([]);
	const [isLoadingPlans, setIsLoadingPlans] = useState(true);

	useEffect(() => {
		async function fetchPlans() {
			try {
				const response = await fetch("/api/v1/plans");
				const data = await response.json();
				setPlans(data.plans);
			} catch (error) {
				console.error("Failed to fetch plans:", error);
			} finally {
				setIsLoadingPlans(false);
			}
		}
		fetchPlans();
	}, []);

	const handlePlanClick = async (plan: PlanData) => {
		// Free plan goes to sign-up
		if (plan.slug === "free") {
			router.push("/sign-up");
			return;
		}

		// Paid plans require authentication
		if (!isSignedIn) {
			router.push(`/sign-in?redirect_url=/pricing`);
			return;
		}

		// Create checkout session
		setLoadingPlan(plan.slug);
		try {
			const response = await apiClient.createCheckoutSession({
				plan: plan.slug,
				interval,
			});
			window.location.href = response.checkoutUrl;
		} catch (error) {
			console.error("Checkout error:", error);
			setLoadingPlan(null);
		}
	};

	const formatPrice = (cents: number) => {
		return `$${(cents / 100).toFixed(0)}`;
	};

	if (isLoadingPlans) {
		return (
			<div className="container py-12">
				<div className="flex items-center justify-center py-24">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

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
				{plans.map((plan) => {
					const features = (plan.features as string[]) || [];
					const price =
						interval === "monthly"
							? plan.price_monthly
							: plan.price_yearly;
					const isFree = plan.slug === "free";

					return (
						<Card
							key={plan.slug}
							className={plan.is_popular ? "border-primary shadow-lg" : ""}
						>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle>{plan.name}</CardTitle>
									{plan.is_popular && <Badge>Popular</Badge>}
								</div>
								<CardDescription>{plan.description}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<span className="text-4xl font-bold">
										{isFree ? "$0" : formatPrice(price)}
									</span>
									<span className="text-muted-foreground">
										/{isFree ? "forever" : "per month"}
									</span>
								</div>
								<ul className="space-y-2">
									{features.map((feature) => (
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
									variant={plan.is_popular ? "default" : "outline"}
									onClick={() => handlePlanClick(plan)}
									disabled={loadingPlan === plan.slug}
								>
									{loadingPlan === plan.slug ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Loading...
										</>
									) : isFree ? (
										"Get Started"
									) : (
										`Subscribe to ${plan.name}`
									)}
								</Button>
							</CardFooter>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
