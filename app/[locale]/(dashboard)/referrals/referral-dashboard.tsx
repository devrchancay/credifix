"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Check, Gift, UserPlus, Link2, Coins } from "lucide-react";

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
}

export function ReferralDashboard({ code, inviteUrl, stats, config }: Props) {
  const t = useTranslations("referral");
  const [copied, setCopied] = useState(false);

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
