"use client";

import { useTranslations } from "next-intl";
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConversationSummary } from "@/hooks/use-chat-ai";
import { cn } from "@/lib/utils";

interface ChatHistoryProps {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatHistory({
  conversations,
  currentConversationId,
  isLoading,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatHistoryProps) {
  const tChat = useTranslations("creditAnalysis.chat");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-3">
        <h3 className="text-sm font-semibold">{tChat("history")}</h3>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onNewConversation}
          title={tChat("newChat")}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-muted-foreground">
            <MessageSquare className="size-8 opacity-30" />
            <p className="text-xs">{tChat("noHistory")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5 p-1.5">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                    currentConversationId === conv.id &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">
                      {conv.title || tChat("untitledChat")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeDate(conv.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    title={tChat("deleteChat")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
