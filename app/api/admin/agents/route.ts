import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET() {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("tier", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ agents: data ?? [] });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

const createAgentSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  tier: z.enum(["basic", "premium"]),
  is_active: z.boolean().optional(),
  system_prompt: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  top_p: z.number().min(0).max(1),
  max_tokens: z.number().min(256).max(16384),
});

export async function POST(request: NextRequest) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = createAgentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .insert({
        ...result.data,
        updated_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An agent with this slug already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
