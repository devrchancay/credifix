import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/roles";
import { getRoleFromMetadata } from "@/lib/roles";
import type { UserPublicMetadata } from "@/types/roles";

export async function GET() {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const clerk = await clerkClient();
    const { data: users } = await clerk.users.getUserList({
      limit: 100,
      orderBy: "-created_at",
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: getRoleFromMetadata(user.publicMetadata as UserPublicMetadata),
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
