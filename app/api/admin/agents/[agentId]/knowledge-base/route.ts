import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/ai/vector-store";

export async function GET(
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
    const { data: files, error } = await supabase
      .from("knowledge_files")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ files: files ?? [] });
  } catch (error) {
    console.error("Error fetching knowledge files:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge files" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { agentId } = await params;

  try {
    const supabase = createAdminClient();

    // Get agent's vector_store_id
    const { data: agent } = await supabase
      .from("agents")
      .select("id, vector_store_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.vector_store_id) {
      return NextResponse.json(
        {
          error:
            "Knowledge base not initialized for this agent. Please initialize the Vector Store first.",
        },
        { status: 400 }
      );
    }

    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const results = [];

    for (const file of files) {
      const { fileId, status } = await uploadFile(
        agent.vector_store_id,
        file
      );

      const { data: record, error: insertError } = await supabase
        .from("knowledge_files")
        .insert({
          openai_file_id: fileId,
          vector_store_id: agent.vector_store_id,
          agent_id: agentId,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          status: status === "completed" ? "completed" : "processing",
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting knowledge file:", insertError);
        continue;
      }

      results.push(record);
    }

    return NextResponse.json({ files: results });
  } catch (error) {
    console.error("Error uploading knowledge files:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
