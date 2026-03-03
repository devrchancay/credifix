import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data: plans, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Fetch plan-agent mappings
    const { data: planAgents } = await supabase
      .from("plan_agents")
      .select("plan_id, agent_id");

    // Group agent_ids by plan_id
    const agentsByPlan: Record<string, string[]> = {};
    for (const pa of planAgents ?? []) {
      if (!agentsByPlan[pa.plan_id]) {
        agentsByPlan[pa.plan_id] = [];
      }
      agentsByPlan[pa.plan_id].push(pa.agent_id);
    }

    // Merge agent_ids into each plan
    const plansWithAgents = (plans ?? []).map((plan) => ({
      ...plan,
      agent_ids: agentsByPlan[plan.id] ?? [],
    }));

    return NextResponse.json({ plans: plansWithAgents });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: plan, error } = await supabase
      .from("plans")
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        stripe_monthly_price_id: body.stripe_monthly_price_id || null,
        stripe_yearly_price_id: body.stripe_yearly_price_id || null,
        features: body.features ?? [],
        limits: body.limits ?? {},
        is_active: body.is_active ?? true,
        is_popular: body.is_popular ?? false,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert plan-agent mappings
    const agentIds: string[] = body.agent_ids ?? [];
    if (agentIds.length > 0) {
      const { error: paError } = await supabase
        .from("plan_agents")
        .insert(agentIds.map((agent_id) => ({ plan_id: plan.id, agent_id })));

      if (paError) {
        console.error("Error inserting plan_agents:", paError);
      }
    }

    return NextResponse.json(
      { plan: { ...plan, agent_ids: agentIds } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating plan:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
