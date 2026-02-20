import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface AuthResult {
  userId: string;
  source: "cookie" | "bearer";
}

/**
 * Authenticates a request using either Supabase cookies (web) or Bearer token (mobile).
 * Returns the authenticated user's ID and auth source, or null if unauthenticated.
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<AuthResult | null> {
  // Try cookie-based auth first (web)
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return { userId: user.id, source: "cookie" };
    }
  } catch {
    // Cookie auth failed, try bearer
  }

  // Fall back to Bearer token (mobile/external)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        }
      );
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        return { userId: user.id, source: "bearer" };
      }
    } catch {
      return null;
    }
  }

  return null;
}
