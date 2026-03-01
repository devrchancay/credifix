import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadFile,
  listFilesWithDetails,
  type VectorStoreFile,
} from "@/lib/ai/vector-store";
import { KNOWLEDGE_TEMP_BUCKET } from "@/lib/supabase/storage";

interface StagedFile {
  storagePath: string;
  filename: string;
  fileSize: number;
}

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

    const body = await request.json();
    const stagedFiles: StagedFile[] = body.files;

    if (!stagedFiles || stagedFiles.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const results: VectorStoreFile[] = [];

    for (const staged of stagedFiles) {
      try {
        // Download from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(KNOWLEDGE_TEMP_BUCKET)
          .download(staged.storagePath);

        if (downloadError || !fileData) {
          console.error(`Failed to download ${staged.storagePath}:`, downloadError);
          results.push({
            id: "",
            filename: staged.filename,
            fileSize: staged.fileSize,
            status: "failed",
            createdAt: Math.floor(Date.now() / 1000),
          });
          continue;
        }

        // Convert Blob to File for OpenAI SDK
        const file = new File([fileData], staged.filename, {
          type: fileData.type,
        });

        const { fileId, status } = await uploadFile(
          agent.vector_store_id,
          file
        );

        results.push({
          id: fileId,
          filename: staged.filename,
          fileSize: staged.fileSize,
          status:
            status === "completed"
              ? "completed"
              : status === "failed" || status === "cancelled"
                ? "failed"
                : "processing",
          createdAt: Math.floor(Date.now() / 1000),
        });
      } finally {
        // Always clean up from storage
        await supabase.storage
          .from(KNOWLEDGE_TEMP_BUCKET)
          .remove([staged.storagePath])
          .catch((err: unknown) =>
            console.error(`Storage cleanup failed for ${staged.storagePath}:`, err)
          );
      }
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
