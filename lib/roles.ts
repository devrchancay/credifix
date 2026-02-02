import { auth, currentUser } from "@clerk/nextjs/server";
import { ROLES, type Role, type UserPublicMetadata } from "@/types/roles";

export async function getUserRole(): Promise<Role> {
  const user = await currentUser();
  const metadata = user?.publicMetadata as UserPublicMetadata | undefined;
  return metadata?.role ?? ROLES.USER;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === ROLES.ADMIN;
}

export async function hasRole(requiredRole: Role): Promise<boolean> {
  const role = await getUserRole();

  // Admin has access to everything
  if (role === ROLES.ADMIN) return true;

  return role === requiredRole;
}

export function getRoleFromMetadata(metadata: UserPublicMetadata | undefined): Role {
  return metadata?.role ?? ROLES.USER;
}
