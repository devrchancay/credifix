import { auth } from "@clerk/nextjs/server";
import { verifyToken } from "@clerk/backend";

export interface AuthResult {
  userId: string;
  source: "cookie" | "bearer";
}

/**
 * Authenticates a request using either Clerk cookies (web) or Bearer token (mobile).
 * Returns the authenticated user's ID and auth source, or null if unauthenticated.
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<AuthResult | null> {
  // Try cookie-based auth first (web)
  const { userId } = await auth();
  if (userId) {
    return { userId, source: "cookie" };
  }

  // Fall back to Bearer token (mobile)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      if (payload.sub) {
        return { userId: payload.sub, source: "bearer" };
      }
    } catch {
      // Invalid token, return null
      return null;
    }
  }

  return null;
}
