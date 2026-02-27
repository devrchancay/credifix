import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReferralStats, getOrCreateReferralCode, getReferralConfig } from "@/lib/referral/service";
import { ReferralDashboard } from "./referral-dashboard";

async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .single();

  return !!data;
}

export default async function ReferralsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const userId = user.id;

  const isSubscribed = await hasActiveSubscription(userId);
  if (!isSubscribed) {
    redirect("/dashboard");
  }

  const t = await getTranslations("referral");

  const [code, stats, config] = await Promise.all([
    getOrCreateReferralCode(userId),
    getReferralStats(userId),
    getReferralConfig(),
  ]);

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${code}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!config.is_active ? (
        <p className="text-muted-foreground">{t("programInactive")}</p>
      ) : (
        <ReferralDashboard
          code={code}
          inviteUrl={inviteUrl}
          stats={stats}
          config={{
            creditsPerReferral: config.credits_per_referral,
            creditsForReferred: config.credits_for_referred,
          }}
        />
      )}
    </div>
  );
}
