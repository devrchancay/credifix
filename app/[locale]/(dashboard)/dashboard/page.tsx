import { auth, currentUser } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanByPriceId } from "@/lib/plans/service";

async function getUserSubscription(userId: string) {
  const supabase = createAdminClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*, plans(slug)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!subscription) {
    return { plan: "free", status: null, subscription: null };
  }

  // Use joined plan slug, fallback to lookup by price ID
  const plans = subscription.plans as { slug: string } | null;
  let plan: string;
  if (plans?.slug) {
    plan = plans.slug;
  } else {
    const dbPlan = await getPlanByPriceId(subscription.stripe_price_id);
    plan = dbPlan?.slug ?? "free";
  }

  return { plan, status: subscription.status, subscription };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const { plan, status, subscription } = userId
    ? await getUserSubscription(userId)
    : { plan: "free", status: null, subscription: null };

  const displayPlan = plan === "free" ? tCommon("free") : plan.toUpperCase();
  const isActive = status === "active" || status === "trialing";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome", { name: user?.firstName ?? "User" })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("userId")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground truncate">
              {userId}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("email")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {user?.emailAddresses[0]?.emailAddress ?? "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isActive ? "text-green-600" : "text-muted-foreground"}`}>
              {isActive ? t("active") : t("inactive") ?? "Inactive"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("plan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{displayPlan}</span>
              {status === "trialing" && (
                <Badge variant="secondary">Trial</Badge>
              )}
            </div>
            {plan === "free" ? (
              <p className="text-xs text-muted-foreground">
                {t("upgrade")}
              </p>
            ) : subscription?.current_period_end ? (
              <p className="text-xs text-muted-foreground">
                {subscription.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
