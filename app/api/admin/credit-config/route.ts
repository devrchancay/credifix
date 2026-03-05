import { NextResponse } from "next/server";
import { isAdmin, requireAdmin } from "@/lib/roles";
import { getCreditConfig, updateCreditConfig } from "@/lib/credits/service";
import { logAdminAction } from "@/lib/api/audit";

export async function GET() {
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const config = await getCreditConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error fetching credit config:", error);
    return NextResponse.json({ error: "Failed to fetch credit config" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (typeof body.credit_value_cents === "number" && body.credit_value_cents > 0) {
      updates.credit_value_cents = body.credit_value_cents;
    }
    if (typeof body.max_discount_percentage === "number" && body.max_discount_percentage > 0 && body.max_discount_percentage <= 100) {
      updates.max_discount_percentage = body.max_discount_percentage;
    }
    if (typeof body.is_redemption_active === "boolean") {
      updates.is_redemption_active = body.is_redemption_active;
    }

    const config = await updateCreditConfig(updates);

    logAdminAction({ userId: adminId, action: "config_change", resourceType: "credit_config", details: updates });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error updating credit config:", error);
    return NextResponse.json({ error: "Failed to update credit config" }, { status: 500 });
  }
}
