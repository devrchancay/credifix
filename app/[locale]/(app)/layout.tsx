"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReferralTracker } from "@/components/referral-tracker";
import { UserDropdown } from "@/components/user-dropdown";
import { Button } from "@/components/ui/button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common");

  return (
    <>
      <ReferralTracker />
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/credit-analysis" className="gap-2">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">{t("backToChat")}</span>
            </Link>
          </Button>
        </div>
        <UserDropdown />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        {children}
      </main>
    </>
  );
}
