"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Coins, ArrowRight } from "lucide-react";

interface PreviewData {
  balance: number;
  creditValueCents: number;
  balanceValueCents: number;
  subscriptionPriceCents: number;
  maxDiscountCents: number;
  maxRedeemableCredits: number;
  maxRedeemableValueCents: number;
  isRedemptionActive: boolean;
  hasActiveSubscription: boolean;
  autoRedeem: boolean;
}

export default function BillingCredits() {
  const t = useTranslations("billing.credits");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [autoRedeem, setAutoRedeem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/credits/preview");
      if (res.ok) {
        const data: PreviewData = await res.json();
        setPreview(data);
        setAutoRedeem(data.autoRedeem);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleToggleAutoRedeem = async (enabled: boolean) => {
    setIsToggling(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/credits/auto-redeem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setAutoRedeem(enabled);
      }
    } catch {
      // revert
      setAutoRedeem(!enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const handleRedeem = async () => {
    const credits = parseInt(redeemAmount, 10);
    if (!credits || credits <= 0) return;

    setIsRedeeming(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/credits/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: t("redeemSuccess", {
            credits: data.creditsRedeemed,
            value: (data.discountCents / 100).toFixed(2),
          }),
        });
        setRedeemAmount("");
        await fetchPreview();
      } else {
        setMessage({ type: "error", text: data.message || t("redeemError") });
      }
    } catch {
      setMessage({ type: "error", text: t("redeemError") });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preview || preview.balance === 0) {
    return null;
  }

  const creditValue = (preview.creditValueCents / 100).toFixed(2);
  const balanceValue = (preview.balanceValueCents / 100).toFixed(2);
  const enteredCredits = parseInt(redeemAmount, 10) || 0;
  const estimatedDiscount = ((enteredCredits * preview.creditValueCents) / 100).toFixed(2);
  const maxDiscountPercentage = preview.subscriptionPriceCents > 0
    ? Math.round((preview.maxDiscountCents / preview.subscriptionPriceCents) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance display */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("balance")}</p>
            <p className="text-2xl font-bold">{preview.balance} <span className="text-sm font-normal text-muted-foreground">{t("creditsLabel")}</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t("value")}</p>
            <p className="text-2xl font-bold">${balanceValue}</p>
          </div>
        </div>

        {/* Auto-redeem toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="auto-redeem" className="font-medium">{t("autoRedeemLabel")}</Label>
            <p className="text-sm text-muted-foreground">{t("autoRedeemDescription")}</p>
          </div>
          <Switch
            id="auto-redeem"
            checked={autoRedeem}
            onCheckedChange={handleToggleAutoRedeem}
            disabled={isToggling}
          />
        </div>

        {/* Auto-redeem preview */}
        {autoRedeem && preview.maxRedeemableCredits > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            {t("autoRedeemPreview", {
              credits: preview.maxRedeemableCredits,
              value: (preview.maxRedeemableValueCents / 100).toFixed(2),
            })}
          </div>
        )}

        {/* Manual redemption */}
        {preview.isRedemptionActive && preview.hasActiveSubscription && (
          <div className="space-y-3">
            <Label className="font-medium">{t("manualRedeem")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={preview.maxRedeemableCredits}
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder={t("creditsPlaceholder")}
                className="flex-1"
              />
              <Button
                onClick={handleRedeem}
                disabled={isRedeeming || enteredCredits <= 0 || enteredCredits > preview.maxRedeemableCredits}
              >
                {isRedeeming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {enteredCredits > 0 ? `$${estimatedDiscount}` : t("apply")}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("rate", { value: creditValue })} · {t("maxInfo", { max: preview.maxRedeemableCredits, percentage: maxDiscountPercentage })}
            </p>
          </div>
        )}

        {/* Message */}
        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
