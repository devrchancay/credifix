"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, Check, Sparkles } from "lucide-react";
import { usePortal } from "@/hooks/use-portal";
import { useSubscription } from "@/hooks/use-subscription";
import { createApiClient } from "@/lib/api/client";
import { capitalize } from "../../../../lib/utils";
import type { PlanData } from "@/lib/api/types";

const apiClient = createApiClient();

export default function BillingPage() {
	const t = useTranslations("billing");
	const { openPortal, isLoading: isPortalLoading } = usePortal();
	const { subscription, plan, isLoading: isSubLoading } = useSubscription();

	if (isSubLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (plan === "free") {
		return <FreePlanView />;
	}

	return <SubscribedView subscription={subscription} plan={plan} openPortal={openPortal} isPortalLoading={isPortalLoading} t={t} />;
}

function SubscribedView({
	subscription,
	plan,
	openPortal,
	isPortalLoading,
	t,
}: {
	subscription: ReturnType<typeof useSubscription>["subscription"];
	plan: string;
	openPortal: (returnUrl?: string) => Promise<string | null>;
	isPortalLoading: boolean;
	t: ReturnType<typeof useTranslations>;
}) {
	const handleManageBilling = async () => {
		await openPortal(window.location.href);
	};

	const isActive = subscription?.status === "active";
	const displayPlan = plan.toUpperCase();
	const displayPrice = plan === "pro" ? "$19" : "$99";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
				<p className="text-muted-foreground">{t("subtitle")}</p>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>{t("currentPlan")}</CardTitle>
						<CardDescription>
							{t("currentPlanDescription", { plan: "" })}
							<Badge variant="secondary" className="ml-1">
								{displayPlan}
							</Badge>
							{isActive && (
								<Badge variant="default" className="ml-1">
									Active
								</Badge>
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">
									{`${capitalize(plan as string)} Plan`}
								</p>
								<p className="text-sm text-muted-foreground">
									{subscription?.cancelAtPeriodEnd
										? "Cancels at end of billing period"
										: "Renews automatically"}
								</p>
							</div>
							<p className="text-2xl font-bold">{displayPrice}/mo</p>
						</div>

						{subscription?.currentPeriodEnd && (
							<p className="text-sm text-muted-foreground">
								Current period ends:{" "}
								{new Date(
									subscription.currentPeriodEnd,
								).toLocaleDateString()}
							</p>
						)}

						<Button
							className="w-full"
							onClick={handleManageBilling}
							disabled={isPortalLoading}
						>
							{isPortalLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Loading...
								</>
							) : (
								<>
									Manage Subscription
									<ExternalLink className="ml-2 h-4 w-4" />
								</>
							)}
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function FreePlanView() {
	const t = useTranslations("billing");
	const [plans, setPlans] = useState<PlanData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/v1/plans")
			.then((r) => (r.ok ? r.json() : { plans: [] }))
			.then((data) => setPlans(data.plans ?? []))
			.catch(() => {})
			.finally(() => setIsLoading(false));
	}, []);

	const handleCheckout = async (planSlug: string) => {
		setCheckoutLoading(planSlug);
		try {
			const res = await apiClient.createCheckoutSession({
				plan: planSlug,
				interval: "monthly",
			});
			window.location.href = res.checkoutUrl;
		} catch {
			setCheckoutLoading(null);
		}
	};

	const paidPlans = plans.filter((p) => p.slug !== "free" && p.is_active);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
				<p className="text-muted-foreground">{t("subtitle")}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("currentPlan")}</CardTitle>
					<CardDescription>
						{t("currentPlanDescription", { plan: "" })}
						<Badge variant="secondary" className="ml-1">FREE</Badge>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">{t("freePlanDescription")}</p>
				</CardContent>
			</Card>

			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="grid gap-6 md:grid-cols-2">
					{paidPlans.map((p) => {
						const features: string[] = Array.isArray(p.features)
							? p.features as string[]
							: [];

						return (
							<Card key={p.id} className={p.is_popular ? "border-primary" : ""}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>{p.name}</CardTitle>
										{p.is_popular && (
											<Badge>
												<Sparkles className="mr-1 h-3 w-3" />
												Popular
											</Badge>
										)}
									</div>
									<CardDescription>{p.description}</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<span className="text-3xl font-bold">
											${((p.price_monthly ?? 0) / 100).toFixed(0)}
										</span>
										<span className="text-muted-foreground">/mo</span>
									</div>

									{features.length > 0 && (
										<ul className="space-y-2">
											{features.map((feature) => (
												<li key={feature} className="flex items-center gap-2 text-sm">
													<Check className="h-4 w-4 text-primary shrink-0" />
													{feature}
												</li>
											))}
										</ul>
									)}

									<Button
										className="w-full"
										onClick={() => handleCheckout(p.slug)}
										disabled={checkoutLoading !== null}
									>
										{checkoutLoading === p.slug ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Loading...
											</>
										) : (
											t("upgradeToPro")
										)}
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
