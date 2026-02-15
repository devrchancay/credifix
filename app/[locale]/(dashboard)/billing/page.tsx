"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { usePortal } from "@/hooks/use-portal";
import { useSubscription } from "@/hooks/use-subscription";
import { createApiClient } from "@/lib/api/client";
import { PLANS, type PlanName } from "@/lib/stripe/config";

const PLAN_ORDER: PlanName[] = ["free", "pro", "enterprise"];

const apiClient = createApiClient();

function getPlanAction(
	currentPlan: PlanName,
	targetPlan: PlanName,
): "upgrade" | "downgrade" | "current" {
	const currentIndex = PLAN_ORDER.indexOf(currentPlan);
	const targetIndex = PLAN_ORDER.indexOf(targetPlan);
	if (currentIndex === targetIndex) return "current";
	return targetIndex > currentIndex ? "upgrade" : "downgrade";
}

export default function BillingPage() {
	const t = useTranslations("billing");
	const { openPortal, isLoading: isPortalLoading } = usePortal();
	const { subscription, plan, isLoading: isSubLoading } = useSubscription();
	const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);

	const isActive = subscription?.status === "active";

	const handlePlanAction = async (targetPlan: PlanName) => {
		const action = getPlanAction(plan, targetPlan);
		if (action === "current") return;

		setLoadingPlan(targetPlan);
		try {
			if (plan === "free" && targetPlan !== "free") {
				// Free user upgrading → create checkout session
				const response = await apiClient.createCheckoutSession({
					plan: targetPlan as "pro" | "enterprise",
					interval: "monthly",
				});
				window.location.href = response.checkoutUrl;
			} else {
				// Paid user changing plan → open Stripe portal
				await openPortal(window.location.href);
			}
		} catch (error) {
			console.error("Plan change error:", error);
		} finally {
			setLoadingPlan(null);
		}
	};

	if (isSubLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const currentPlanConfig = PLANS[plan];
	const displayPrice =
		plan === "free"
			? t("free")
			: `$${currentPlanConfig.price.monthly}`;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
				<p className="text-muted-foreground">{t("subtitle")}</p>
			</div>

			<div className="grid gap-6">
				{/* Current Plan Card */}
				<Card>
					<CardHeader>
						<CardTitle>{t("currentPlan")}</CardTitle>
						<CardDescription>
							{t("currentPlanDescription", { plan: "" })}
							<Badge variant="secondary" className="ml-1">
								{plan.toUpperCase()}
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
									{currentPlanConfig.name} Plan
								</p>
								<p className="text-sm text-muted-foreground">
									{plan === "free"
										? currentPlanConfig.description
										: subscription?.cancelAtPeriodEnd
											? t("cancelsAtEnd")
											: t("renewsAutomatically")}
								</p>
							</div>
							<p className="text-2xl font-bold">
								{displayPrice}
								{plan !== "free" && (
									<span className="text-sm font-normal text-muted-foreground">
										{t("perMonth")}
									</span>
								)}
							</p>
						</div>

						{subscription?.currentPeriodEnd && (
							<p className="text-sm text-muted-foreground">
								{t("periodEnds", {
									date: new Date(
										subscription.currentPeriodEnd,
									).toLocaleDateString(),
								})}
							</p>
						)}

						{plan !== "free" && (
							<Button
								variant="outline"
								className="w-full"
								onClick={() => openPortal(window.location.href)}
								disabled={isPortalLoading}
							>
								{isPortalLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Loading...
									</>
								) : (
									t("manageSubscription")
								)}
							</Button>
						)}
					</CardContent>
				</Card>

				{/* Available Plans */}
				<Card>
					<CardHeader>
						<CardTitle>{t("availablePlans")}</CardTitle>
						<CardDescription>
							{t("availablePlansDescription")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-3">
							{PLAN_ORDER.map((planKey) => {
								const planConfig = PLANS[planKey];
								const action = getPlanAction(plan, planKey);
								const isCurrent = action === "current";
								const isUpgrade = action === "upgrade";
								const isLoading = loadingPlan === planKey;

								return (
									<Card
										key={planKey}
										className={
											isCurrent
												? "border-primary shadow-md"
												: ""
										}
									>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<CardTitle className="text-lg">
													{planConfig.name}
												</CardTitle>
												{isCurrent && (
													<Badge variant="default">
														{t("current")}
													</Badge>
												)}
												{isUpgrade && !isCurrent && (
													<Badge variant="secondary">
														<ArrowUp className="mr-1 h-3 w-3" />
														{t("upgrade")}
													</Badge>
												)}
												{!isUpgrade && !isCurrent && (
													<Badge variant="outline">
														<ArrowDown className="mr-1 h-3 w-3" />
														{t("downgrade")}
													</Badge>
												)}
											</div>
											<CardDescription>
												{planConfig.description}
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-3 pb-3">
											<div>
												<span className="text-3xl font-bold">
													{planKey === "free"
														? t("free")
														: `$${planConfig.price.monthly}`}
												</span>
												{planKey !== "free" && (
													<span className="text-muted-foreground">
														{t("perMonth")}
													</span>
												)}
												{planKey === "free" && (
													<span className="text-muted-foreground ml-1">
														{t("forever")}
													</span>
												)}
											</div>
											<ul className="space-y-1.5">
												{planConfig.features.map(
													(feature) => (
														<li
															key={feature}
															className="flex items-center gap-2 text-sm"
														>
															<Check className="h-3.5 w-3.5 text-primary shrink-0" />
															{feature}
														</li>
													),
												)}
											</ul>
										</CardContent>
										<CardFooter>
											{isCurrent ? (
												<Button
													className="w-full"
													variant="outline"
													disabled
												>
													{t("current")}
												</Button>
											) : (
												<Button
													className="w-full"
													variant={
														isUpgrade
															? "default"
															: "outline"
													}
													onClick={() =>
														handlePlanAction(
															planKey,
														)
													}
													disabled={
														isLoading ||
														isPortalLoading
													}
												>
													{isLoading ||
													(isPortalLoading &&
														loadingPlan ===
															planKey) ? (
														<>
															<Loader2 className="mr-2 h-4 w-4 animate-spin" />
															Loading...
														</>
													) : isUpgrade ? (
														<>
															<ArrowUp className="mr-2 h-4 w-4" />
															{t("upgrade")}
														</>
													) : (
														<>
															<ArrowDown className="mr-2 h-4 w-4" />
															{t("downgrade")}
														</>
													)}
												</Button>
											)}
										</CardFooter>
									</Card>
								);
							})}
						</div>
					</CardContent>
				</Card>

				{/* Billing History - only for paid users */}
				{plan !== "free" && (
					<Card>
						<CardHeader>
							<CardTitle>{t("billingHistory")}</CardTitle>
							<CardDescription>
								{t("billingHistoryDescription")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{t("noBillingHistory")}
							</p>
							<Button
								variant="outline"
								className="mt-4"
								onClick={() =>
									openPortal(window.location.href)
								}
								disabled={isPortalLoading}
							>
								{isPortalLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Loading...
									</>
								) : (
									"View Invoices in Portal"
								)}
							</Button>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
