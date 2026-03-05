"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Check, Gift, UserPlus, Link2, Coins, ArrowRightLeft } from "lucide-react";
import type { RedemptionPreview } from "@/lib/credits/service";

interface ReferralStats {
  code: string | null;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  referrals: Array<{
    id: string;
    status: string;
    credits_awarded_referrer: number;
    created_at: string;
    referred: { email: string; full_name: string | null } | null;
  }>;
  credits: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  };
}

interface ReferralConfig {
  creditsPerReferral: number;
  creditsForReferred: number;
}

interface Props {
  code: string;
  inviteUrl: string;
  stats: ReferralStats;
  config: ReferralConfig;
  redemption: RedemptionPreview;
}

export function ReferralDashboard({ inviteUrl, stats, config, redemption }: Props) {
  const t = useTranslations("referral");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [creditsToRedeem, setCreditsToRedeem] = useState(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default" as const;
      case "pending":
        return "secondary" as const;
      case "expired":
      case "cancelled":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t("completed");
      case "pending":
        return t("pending");
      case "expired":
        return t("expired");
      case "cancelled":
        return t("cancelled");
      default:
        return status;
    }
  };

  const formatCents = (cents: number) => (cents / 100).toFixed(2);

  const discountPreview = creditsToRedeem * redemption.creditValueCents;

  const handleRedeem = async () => {
    if (creditsToRedeem <= 0 || creditsToRedeem > redemption.maxRedeemableCredits) return;

    setIsRedeeming(true);
    setRedeemMessage(null);

    try {
      const res = await fetch("/api/v1/credits/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: creditsToRedeem }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRedeemMessage({
          type: "success",
          text: t("redemption.success", {
            credits: data.creditsRedeemed,
            value: formatCents(data.discountCents),
          }),
        });
        setCreditsToRedeem(0);
        router.refresh();
      } else {
        setRedeemMessage({
          type: "error",
          text: data.error || t("redemption.error"),
        });
      }
    } catch {
      setRedeemMessage({ type: "error", text: t("redemption.error") });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Share Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
          <h2 className="text-2xl font-bold">{t("shareTitle")}</h2>
          <p className="text-violet-100">{t("shareSubtitle")}</p>
        </div>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="font-medium mb-3">{t("howItWorks")}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm">{t("step1")}</span>
              </div>
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {t("step2", { credits: config.creditsForReferred })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {t("step3", { credits: config.creditsPerReferral })}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("linkUsedBy", { count: stats.totalReferrals })}
          </p>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1 font-mono">{inviteUrl}</span>
            <Button
              variant="default"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  {t("copyLink")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credits Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("balance")}</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.credits.balance}</div>
            <p className="text-xs text-muted-foreground mt-1">
              = ${formatCents(redemption.balanceValueCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalEarned")}</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{stats.credits.totalEarned}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalSpent")}</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.credits.totalSpent}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redeem Credits */}
      {redemption.isRedemptionActive && redemption.hasActiveSubscription && stats.credits.balance > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-6 w-6" />
              <h2 className="text-2xl font-bold">{t("redemption.title")}</h2>
            </div>
            <p className="text-emerald-100 mt-1">{t("redemption.subtitle")}</p>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span>
                {t("redemption.rate", { value: formatCents(redemption.creditValueCents) })}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits-redeem">{t("redemption.creditsToRedeem")}</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="credits-redeem"
                  type="number"
                  min={0}
                  max={redemption.maxRedeemableCredits}
                  value={creditsToRedeem}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setCreditsToRedeem(Math.min(val, redemption.maxRedeemableCredits));
                  }}
                  className="w-32"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreditsToRedeem(redemption.maxRedeemableCredits)}
                >
                  Max ({redemption.maxRedeemableCredits})
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("redemption.maxInfo", {
                  max: redemption.maxRedeemableCredits,
                  percentage: Math.round(
                    (redemption.maxDiscountCents / redemption.subscriptionPriceCents) * 100
                  ) || 0,
                })}
              </p>
            </div>

            {creditsToRedeem > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-lg font-semibold">
                  ${formatCents(discountPreview)} {t("redemption.discount")}
                </p>
              </div>
            )}

            <Button
              onClick={handleRedeem}
              disabled={isRedeeming || creditsToRedeem <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isRedeeming ? t("redemption.processing") : t("redemption.applyButton")}
            </Button>

            {redeemMessage && (
              <p
                className={`text-sm ${
                  redeemMessage.type === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {redeemMessage.text}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("referralHistory")}</CardTitle>
          <CardDescription>
            {stats.totalReferrals === 0 ? t("noReferrals") : undefined}
          </CardDescription>
        </CardHeader>
        {stats.referrals.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("user")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("creditsAwarded")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      {referral.referred?.full_name ?? referral.referred?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(referral.status)}>
                        {statusLabel(referral.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>+{referral.credits_awarded_referrer}</TableCell>
                    <TableCell>
                      {new Date(referral.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
