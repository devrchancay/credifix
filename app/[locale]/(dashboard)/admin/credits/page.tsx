import { getTranslations } from "next-intl/server";
import { RequireRole } from "@/components/auth/require-role";
import { ROLES } from "@/types/roles";
import { CreditConfigManagement } from "./credit-config-management";

export default async function AdminCreditsPage() {
  const t = await getTranslations("admin");

  return (
    <RequireRole role={ROLES.ADMIN}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("credits.title")}
          </h1>
          <p className="text-muted-foreground">{t("credits.subtitle")}</p>
        </div>

        <CreditConfigManagement />
      </div>
    </RequireRole>
  );
}
