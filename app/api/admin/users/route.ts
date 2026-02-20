import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const formattedUsers = (profiles ?? []).map((profile) => {
      const [firstName, ...lastParts] = (profile.full_name ?? "").split(" ");
      return {
        id: profile.id,
        email: profile.email,
        firstName: firstName || null,
        lastName: lastParts.join(" ") || null,
        imageUrl: profile.avatar_url,
        role: profile.role,
        createdAt: profile.created_at,
      };
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
