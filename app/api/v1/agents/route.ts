import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";
import { listActiveAgents } from "@/lib/ai/agents";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public endpoint: list agents available for the user's plan */
export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }
    const { userId } = authResult;

    const supabase = createAdminClient();

    // 1. Get user's active subscription to determine their plan
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .limit(1)
      .maybeSingle();

    let planId = sub?.plan_id ?? null;

    // 2. If no subscription, use the "free" plan
    if (!planId) {
      const { data: freePlan } = await supabase
        .from("plans")
        .select("id")
        .eq("slug", "free")
        .single();
      planId = freePlan?.id ?? null;
    }

    // 3. Get agent IDs for this plan from plan_agents
    let allowedAgentIds: string[] | null = null;
    if (planId) {
      const { data: planAgents } = await supabase
        .from("plan_agents")
        .select("agent_id")
        .eq("plan_id", planId);

      if (planAgents && planAgents.length > 0) {
        allowedAgentIds = planAgents.map((pa) => pa.agent_id);
      }
    }

    // 4. Get all active agents
    const allAgents = await listActiveAgents();

    // 5. Filter by plan_agents if configured, otherwise return all (backward compat)
    const agents = allowedAgentIds
      ? allAgents.filter((a) => allowedAgentIds.includes(a.id))
      : allAgents;

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
