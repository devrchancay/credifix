import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/types/roles";

export async function getUserRole(): Promise<Role> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return ROLES.USER;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (profile?.role as Role) ?? ROLES.USER;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === ROLES.ADMIN;
}

export async function hasRole(requiredRole: Role): Promise<boolean> {
  const role = await getUserRole();

  if (role === ROLES.ADMIN) return true;

  return role === requiredRole;
}

export function getRoleFromProfile(
  profile: { role?: string } | undefined
): Role {
  return (profile?.role as Role) ?? ROLES.USER;
}
