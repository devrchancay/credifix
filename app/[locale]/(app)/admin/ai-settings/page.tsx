import { getTranslations } from "next-intl/server";
import { RequireRole } from "@/components/auth/require-role";
import { ROLES } from "@/types/roles";
import { BrainCircuit } from "lucide-react";
import { AgentSettingsView } from "@/components/admin/agent-settings-view";

export default async function AISettingsPage() {
  const t = await getTranslations("admin.aiSettings");

  return (
    <RequireRole role={ROLES.ADMIN}>
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <BrainCircuit className="h-5 w-5" />
            <span className="font-medium">{t("title")}</span>
          </div>
          <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80">
            {t("subtitle")}
          </p>
        </div>

        <AgentSettingsView />
      </div>
    </RequireRole>
  );
}
