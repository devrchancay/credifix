import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadFile,
  listFilesWithDetails,
  type VectorStoreFile,
} from "@/lib/ai/vector-store";

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
    const { data: agent } = await supabase
      .from("agents")
      .select("id, vector_store_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.vector_store_id) {
      return NextResponse.json({ files: [], hasVectorStore: false });
    }

    const files = await listFilesWithDetails(agent.vector_store_id);

    return NextResponse.json({ files, hasVectorStore: true });
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

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const results: VectorStoreFile[] = [];

    for (const file of files) {
      const { fileId, status } = await uploadFile(
        agent.vector_store_id,
        file
      );

      results.push({
        id: fileId,
        filename: file.name,
        fileSize: file.size,
        status:
          status === "completed"
            ? "completed"
            : status === "failed" || status === "cancelled"
              ? "failed"
              : "processing",
        createdAt: Math.floor(Date.now() / 1000),
      });
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
