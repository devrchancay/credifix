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
      .from("ai_config")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error("Error fetching AI config:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI config" },
      { status: 500 }
    );
  }
}

const updateConfigSchema = z.object({
  system_prompt: z.string().min(1).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().min(256).max(16384).optional(),
  vector_store_id: z.string().nullable().optional(),
  assistant_id: z.string().nullable().optional(),
});

export async function PUT(request: NextRequest) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = updateConfigSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    // Get current user ID for updated_by
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    const supabase = createAdminClient();

    // Get the singleton config ID
    const { data: existing } = await supabase
      .from("ai_config")
      .select("id")
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "AI config not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("ai_config")
      .update({
        ...result.data,
        updated_by: user?.id || null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error("Error updating AI config:", error);
    return NextResponse.json(
      { error: "Failed to update AI config" },
      { status: 500 }
    );
  }
}
