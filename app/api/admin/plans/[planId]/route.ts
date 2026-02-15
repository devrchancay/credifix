import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { planId } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: plan, error } = await supabase
      .from("plans")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price_monthly !== undefined && { price_monthly: body.price_monthly }),
        ...(body.price_yearly !== undefined && { price_yearly: body.price_yearly }),
        ...(body.stripe_monthly_price_id !== undefined && { stripe_monthly_price_id: body.stripe_monthly_price_id }),
        ...(body.stripe_yearly_price_id !== undefined && { stripe_yearly_price_id: body.stripe_yearly_price_id }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.limits !== undefined && { limits: body.limits }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        ...(body.is_popular !== undefined && { is_popular: body.is_popular }),
        ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { planId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", planId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
