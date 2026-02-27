"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ExternalLink, Loader2 } from "lucide-react";
import { usePortal } from "@/hooks/use-portal";
import { useSubscription } from "@/hooks/use-subscription";
import { capitalize } from "../../../../lib/utils";

export default function BillingPage() {
	const router = useRouter();
	const t = useTranslations("billing");
	const { openPortal, isLoading: isPortalLoading } = usePortal();
	const { subscription, plan, isLoading: isSubLoading } = useSubscription();

	// Redirect to pricing if user has free plan
	useEffect(() => {
		if (!isSubLoading && plan === "free") {
			router.replace("/dashboard");
		}
	}, [isSubLoading, plan, router]);

	const handleManageBilling = async () => {
		await openPortal(window.location.href);
	};

	const isActive = subscription?.status === "active";

	// Show loading while checking subscription or redirecting
	if (isSubLoading || plan === "free") {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

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
