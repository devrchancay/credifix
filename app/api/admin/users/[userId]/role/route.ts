import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { ROLES, type Role } from "@/types/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const { role } = await req.json();

  if (!role || !Object.values(ROLES).includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
