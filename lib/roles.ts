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

/** Returns the admin user's ID, or null if not admin. */
export async function requireAdmin(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profile?.role as Role) !== ROLES.ADMIN) return null;

  return user.id;
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
