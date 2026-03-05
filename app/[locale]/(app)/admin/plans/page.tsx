import { getTranslations } from "next-intl/server";
import { RequireRole } from "@/components/auth/require-role";
import { ROLES } from "@/types/roles";
import { PlanManagement } from "./plan-management";

export default async function AdminPlansPage() {
  const t = await getTranslations("admin");

  return (
    <RequireRole role={ROLES.ADMIN}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("plans.title")}
          </h1>
          <p className="text-muted-foreground">{t("plans.subtitle")}</p>
        </div>

        <PlanManagement />
      </div>
    </RequireRole>
  );
}
