import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";

    const supabase = createAdminClient();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: profiles, error, count } = await query;

    if (error) throw error;

    const users = (profiles ?? []).map((profile) => {
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

    return NextResponse.json({
      users,
      pagination: {
        page,
        perPage,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / perPage),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
