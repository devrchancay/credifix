import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import Link from "next/link";
import { validateReferralCode, getReferralConfig } from "@/lib/referral/service";

interface Props {
  params: Promise<{ code: string; locale: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { code, locale } = await params;
  const t = await getTranslations("referral.invitePage");
  const tCommon = await getTranslations("common");

  const [validation, config] = await Promise.all([
    validateReferralCode(code),
    getReferralConfig(),
  ]);

  if (!validation.valid || !config.is_active) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{t("invalidCode")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtitle = validation.referrerName
    ? t("subtitle", { name: validation.referrerName, appName: tCommon("appName") })
    : t("defaultSubtitle", { appName: tCommon("appName") });

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-center text-white">
          <Gift className="mx-auto h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-violet-100 mt-2">{subtitle}</p>
        </div>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-lg font-medium">
            {t("bonus", { credits: config.credits_for_referred })}
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href={`/${locale}/sign-up?ref=${code}`}>
              {t("cta")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
