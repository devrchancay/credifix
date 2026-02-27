import { getTranslations } from "next-intl/server";
import { ChatContainer } from "@/components/credit-analysis/chat-container";

export default async function CreditAnalysisPage() {
  const t = await getTranslations("creditAnalysis");

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ChatContainer />
    </div>
  );
}
