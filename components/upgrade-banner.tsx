"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

interface UpgradeBannerProps {
  variant?: "inline" | "card";
}

export function UpgradeBanner({ variant = "card" }: UpgradeBannerProps) {
  const { isPro, isLoading } = useSubscription();
  const t = useTranslations("upgrade");

  if (isLoading || isPro) return null;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Sparkles className="size-5 shrink-0 text-primary" />
        <p className="flex-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/user/billing">{t("cta")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-semibold">{t("title")}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {t("badge")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/user/billing">{t("cta")}</Link>
        </Button>
      </div>
    </div>
  );
}
