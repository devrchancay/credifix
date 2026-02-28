import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileStatus, deleteFile } from "@/lib/ai/vector-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string }> }
) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { agentId, fileId } = await params;

  try {
    const supabase = createAdminClient();
    const { data: agent } = await supabase
      .from("agents")
      .select("id, vector_store_id")
      .eq("id", agentId)
      .single();

    if (!agent?.vector_store_id) {
      return NextResponse.json({ error: "Agent or vector store not found" }, { status: 404 });
    }

    const status = await getFileStatus(agent.vector_store_id, fileId);

    const mappedStatus =
      status === "completed"
        ? "completed"
        : status === "failed" || status === "cancelled"
          ? "failed"
          : "processing";

    return NextResponse.json({ file: { id: fileId, status: mappedStatus } });
  } catch (error) {
    console.error("Error fetching file status:", error);
    return NextResponse.json(
      { error: "Failed to fetch file status" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; fileId: string }> }
) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { agentId, fileId } = await params;

  try {
    const supabase = createAdminClient();
    const { data: agent } = await supabase
      .from("agents")
      .select("id, vector_store_id")
      .eq("id", agentId)
      .single();

    if (!agent?.vector_store_id) {
      return NextResponse.json({ error: "Agent or vector store not found" }, { status: 404 });
    }

    await deleteFile(agent.vector_store_id, fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
