"use client";

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
import { Loader2 } from "lucide-react";
import { usePortal } from "@/hooks/use-portal";
import { useSubscription } from "@/hooks/use-subscription";
import { capitalize } from "../../../../lib/utils";

export default function BillingPage() {
	const t = useTranslations("billing");
	const tCommon = useTranslations("common");
	const { openPortal, isLoading: isPortalLoading } = usePortal();
	const { subscription, plan, isLoading: isSubLoading } = useSubscription();

	const handleManageBilling = async () => {
		await openPortal(window.location.href);
	};

	const isActive = subscription?.status === "active";
	const displayPlan = plan === "free" ? tCommon("free") : plan.toUpperCase();
	const displayPrice = plan === "free" ? "$0" : plan === "pro" ? "$19" : "$99";

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
						{isSubLoading ? (
							<div className="flex items-center justify-center py-4">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : (
							<>
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium">
											{plan === "free"
												? t("freePlan")
												: `${capitalize(plan as string)} Plan`}
										</p>
										<p className="text-sm text-muted-foreground">
											{plan === "free"
												? t("freePlanDescription")
												: subscription?.cancelAtPeriodEnd
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
									) : plan === "free" ? (
										t("upgradeToPro")
									) : (
										"Manage Subscription"
									)}
								</Button>
							</>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("billingHistory")}</CardTitle>
						<CardDescription>{t("billingHistoryDescription")}</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							{t("noBillingHistory")}
						</p>
						<Button
							variant="outline"
							className="mt-4"
							onClick={handleManageBilling}
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
			</div>
		</div>
	);
}
