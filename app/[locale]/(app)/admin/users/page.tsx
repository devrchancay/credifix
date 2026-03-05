import { getTranslations } from "next-intl/server";
import { RequireRole } from "@/components/auth/require-role";
import { ROLES } from "@/types/roles";
import { UserManagement } from "../user-management";
import { Shield } from "lucide-react";

export default async function AdminUsersPage() {
	const t = await getTranslations("admin");

	return (
		<RequireRole role={ROLES.ADMIN}>
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
					<p className="text-muted-foreground">{t("subtitle")}</p>
				</div>

				<UserManagement />
			</div>
		</RequireRole>
	);
}
