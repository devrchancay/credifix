import { getTranslations } from "next-intl/server";
import { RequireRole } from "@/components/auth/require-role";
import { ROLES } from "@/types/roles";
import { UserManagement } from "./user-management";
import { Shield } from "lucide-react";

export default async function AdminPage() {
  const t = await getTranslations("admin");

  return (
    <RequireRole role={ROLES.ADMIN}>
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Shield className="h-5 w-5" />
            <span className="font-medium">{t("adminArea")}</span>
          </div>
          <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
            {t("adminOnly")}
          </p>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <UserManagement />
      </div>
    </RequireRole>
  );
}
