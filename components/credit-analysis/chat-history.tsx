"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Trash2, Loader2 } from "lucide-react";
import type { ConversationSummary } from "@/hooks/use-chat-ai";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-muted-foreground">
        <MessageSquare className="size-8 opacity-30" />
        <p className="text-xs">{tChat("noHistory")}</p>
      </div>
    );
  }

  return (
    <>
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
                  {conv.updatedAt ? formatRelativeDate(conv.updatedAt) : ""}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(conv.id);
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tChat("deleteChatTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tChat("deleteChatConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tChat("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId) onDeleteConversation(deleteId);
                setDeleteId(null);
              }}
            >
              {tChat("deleteChat")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
