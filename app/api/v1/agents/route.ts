import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";
import { listActiveAgents } from "@/lib/ai/agents";

/** Public endpoint: list active agents (for chat agent selector) */
export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const agents = await listActiveAgents();

    return NextResponse.json({
      agents: agents.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        description: a.description,
        tier: a.tier,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
