import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";

export type Plan = Tables<"plans">;

export async function getPlans(): Promise<Plan[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch plans: ${error.message}`);
  }

  return data;
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getPlanByPriceId(priceId: string): Promise<Plan | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .or(
      `stripe_monthly_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`
    )
    .single();

  if (error) {
    return null;
  }

  return data;
}
