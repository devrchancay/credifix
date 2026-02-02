import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AboutPage() {
  const t = await getTranslations("about");

  const features = ["nextjs", "clerk", "supabase", "stripe"] as const;

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature}>
              <CardHeader>
                <CardTitle>{t(`features.${feature}.title`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(`features.${feature}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
