import { redirect } from "next/navigation";
import { hasRole } from "@/lib/roles";
import { type Role } from "@/types/roles";

interface RequireRoleProps {
  role: Role;
  children: React.ReactNode;
  fallbackUrl?: string;
}

export async function RequireRole({
  role,
  children,
  fallbackUrl = "/dashboard",
}: RequireRoleProps) {
  const hasAccess = await hasRole(role);

  if (!hasAccess) {
    redirect(fallbackUrl);
  }

  return <>{children}</>;
}
