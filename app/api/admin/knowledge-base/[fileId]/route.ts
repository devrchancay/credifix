import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileStatus, deleteFile } from "@/lib/ai/vector-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { fileId } = await params;

  try {
    const supabase = createAdminClient();
    const { data: file, error } = await supabase
      .from("knowledge_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check status from OpenAI if still processing
    if (file.status === "processing") {
      try {
        const openaiStatus = await getFileStatus(
          file.vector_store_id,
          file.openai_file_id
        );
        const mappedStatus =
          openaiStatus === "completed"
            ? "completed"
            : openaiStatus === "failed"
              ? "failed"
              : "processing";

        if (mappedStatus !== file.status) {
          await supabase
            .from("knowledge_files")
            .update({ status: mappedStatus })
            .eq("id", fileId);

          return NextResponse.json({ file: { ...file, status: mappedStatus } });
        }
      } catch {
        // If we can't reach OpenAI, return current DB status
      }
    }

    return NextResponse.json({ file });
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
  { params }: { params: Promise<{ fileId: string }> }
) {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { fileId } = await params;

  try {
    const supabase = createAdminClient();
    const { data: file, error } = await supabase
      .from("knowledge_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from OpenAI
    try {
      await deleteFile(file.vector_store_id, file.openai_file_id);
    } catch (openaiError) {
      console.error("Error deleting from OpenAI:", openaiError);
      // Continue to delete from DB even if OpenAI deletion fails
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from("knowledge_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
