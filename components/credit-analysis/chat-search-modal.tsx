"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, MessageSquare, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  conversationId: string;
  conversationTitle: string | null;
  messageContent: string;
  messageRole: string;
  createdAt: string;
}

interface ChatSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (id: string) => void;
}

export function ChatSearchModal({
  open,
  onOpenChange,
  onSelectConversation,
}: ChatSearchModalProps) {
  const t = useTranslations("creditAnalysis.chat");
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!userId || searchQuery.trim().length < 2) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const supabase = createClient();

      // Search in messages content and conversation titles
      const { data } = await supabase
        .from("messages")
        .select("content, role, created_at, conversation_id, conversations!inner(id, title, user_id, deleted_at)")
        .eq("conversations.user_id", userId)
        .is("conversations.deleted_at", null)
        .ilike("content", `%${searchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setResults(
          data.map((m) => {
            const conv = m.conversations as unknown as { id: string; title: string | null };
            return {
              conversationId: conv.id,
              conversationTitle: conv.title,
              messageContent: m.content,
              messageRole: m.role,
              createdAt: m.created_at ?? "",
            };
          })
        );
      } else {
        setResults([]);
      }
      setIsSearching(false);
    },
    [userId]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelect = (conversationId: string) => {
    onSelectConversation(conversationId);
    onOpenChange(false);
  };

  // Highlight matching text
  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;

    // Show a window around the match
    const contextChars = 60;
    const start = Math.max(0, idx - contextChars);
    const end = Math.min(text.length, idx + q.length + contextChars);

    const before = (start > 0 ? "…" : "") + text.slice(start, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length, end) + (end < text.length ? "…" : "");

    return (
      <>
        {before}
        <mark className="rounded bg-primary/20 px-0.5 text-foreground">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[35%] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("searchChats")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {isSearching && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {query.trim().length >= 2 && !isSearching && results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("searchNoResults")}
            </div>
          )}

          {results.length > 0 && (
            <ul className="p-1.5">
              {results.map((result, i) => (
                <li key={`${result.conversationId}-${i}`}>
                  <button
                    onClick={() => handleSelect(result.conversationId)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                    )}
                  >
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {result.conversationTitle || t("untitledChat")}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm">
                        {highlightMatch(result.messageContent, query)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("searchHint")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
