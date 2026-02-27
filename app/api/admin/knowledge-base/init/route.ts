import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createVectorStore } from "@/lib/ai/vector-store";

export async function POST() {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    // Check if vector store already exists
    const { data: config } = await supabase
      .from("ai_config")
      .select("id, vector_store_id")
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: "AI config not found" },
        { status: 404 }
      );
    }

    if (config.vector_store_id) {
      return NextResponse.json(
        { error: "Vector store already initialized", vectorStoreId: config.vector_store_id },
        { status: 400 }
      );
    }

    // Create new vector store in OpenAI
    const vectorStoreId = await createVectorStore("Credifix Knowledge Base");

    // Save to ai_config
    const { error: updateError } = await supabase
      .from("ai_config")
      .update({ vector_store_id: vectorStoreId })
      .eq("id", config.id);

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
