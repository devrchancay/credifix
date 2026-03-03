"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface CreditConfig {
  credit_value_cents: number;
  max_discount_percentage: number;
  is_redemption_active: boolean;
}

export function CreditConfigManagement() {
  const t = useTranslations("admin.credits");
  const [config, setConfig] = useState<CreditConfig>({
    credit_value_cents: 25,
    max_discount_percentage: 75,
    is_redemption_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/credit-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.config) setConfig(data.config);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/credit-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        toast.success(t("saved"));
      } else {
        toast.error(t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="credit-value">{t("creditValue")}</Label>
          <Input
            id="credit-value"
            type="number"
            min={1}
            value={config.credit_value_cents}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                credit_value_cents: parseInt(e.target.value) || 1,
              }))
            }
            className="w-48"
          />
          <p className="text-xs text-muted-foreground">
            {t("creditValueHelp")} (${(config.credit_value_cents / 100).toFixed(2)})
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-discount">{t("maxDiscount")}</Label>
          <Input
            id="max-discount"
            type="number"
            min={1}
            max={100}
            value={config.max_discount_percentage}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                max_discount_percentage: Math.min(
                  100,
                  Math.max(1, parseInt(e.target.value) || 1)
                ),
              }))
            }
            className="w-48"
          />
          <p className="text-xs text-muted-foreground">{t("maxDiscountHelp")}</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>{t("redemptionActive")}</Label>
            <p className="text-xs text-muted-foreground">{t("redemptionActiveHelp")}</p>
          </div>
          <Switch
            checked={config.is_redemption_active}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, is_redemption_active: checked }))
            }
          />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "..." : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
