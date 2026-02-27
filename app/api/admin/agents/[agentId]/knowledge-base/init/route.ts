import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createVectorStore } from "@/lib/ai/vector-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { agentId } = await params;

  try {
    const supabase = createAdminClient();

    const { data: agent } = await supabase
      .from("agents")
      .select("id, name, vector_store_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.vector_store_id) {
      return NextResponse.json(
        {
          error: "Vector store already initialized",
          vectorStoreId: agent.vector_store_id,
        },
        { status: 400 }
      );
    }

    const vectorStoreId = await createVectorStore(
      `Credifix - ${agent.name}`
    );

    const { error: updateError } = await supabase
      .from("agents")
      .update({ vector_store_id: vectorStoreId })
      .eq("id", agentId);

    if (updateError) throw updateError;

    return NextResponse.json({ vectorStoreId });
  } catch (error) {
    console.error("Error initializing vector store:", error);
    return NextResponse.json(
      { error: "Failed to initialize knowledge base" },
      { status: 500 }
    );
  }
}
