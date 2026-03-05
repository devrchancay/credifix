import { ChatContainer } from "@/components/credit-analysis/chat-container";

export default async function CreditAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c: initialConversationId } = await searchParams;

  return (
    <div className="-m-4 -mb-4">
      <ChatContainer initialConversationId={initialConversationId} />
    </div>
  );
}
