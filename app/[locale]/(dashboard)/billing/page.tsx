import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function BillingPage() {
  const { userId } = await auth();
  const t = await getTranslations("billing");
  const tCommon = await getTranslations("common");

  if (!userId) {
    redirect("/sign-in");
  }

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
              <Badge variant="secondary" className="ml-1">{tCommon("free")}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("freePlan")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("freePlanDescription")}
                </p>
              </div>
              <p className="text-2xl font-bold">$0/mo</p>
            </div>
            <Button className="w-full" asChild>
              <a href="/pricing">{t("upgradeToPro")}</a>
            </Button>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
