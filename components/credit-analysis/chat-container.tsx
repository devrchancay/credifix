"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChatMessageBubble, type ChatMessage, type Attachment } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { ReasoningIndicator } from "./reasoning-indicator";
import { AgentSelector } from "./agent-selector";
import { AlertCircle, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatAI } from "@/hooks/use-chat-ai";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { useUser } from "@/hooks/use-user";
import { useHaptics } from "@/hooks/use-haptics";
import { useSearchParams } from "next/navigation";

/** Extract text content from a UIMessage's parts */
function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Check if a message has an active reasoning part (model is thinking) */
function hasActiveReasoning(parts: Array<{ type: string; text?: string }>): boolean {
  return parts.some((p) => p.type === "reasoning");
}

export function ChatContainer({
  initialConversationId,
}: {
  initialConversationId?: string;
}) {
  const tChat = useTranslations("creditAnalysis.chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { fullName } = useUser();

  const {
    messages: aiMessages,
    isLoading,
    isTranscribing,
    isProcessingFiles,
    conversationId,
    agentId,
    error,
    fileError,
    clearFileError,
    sendMessage,
    selectAgent,
    messageAttachments,
    startNewConversation,
    loadConversation,
    isAuthLoaded,
    status,
  } = useChatAI();

  const haptics = useHaptics();
  const prevStatusRef = useRef(status);

  // React to URL ?c= param changes (sidebar clicks) and initial page load
  const searchParams = useSearchParams();
  const urlConversationId = searchParams.get("c") ?? initialConversationId;

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (urlConversationId && urlConversationId !== conversationId) {
      loadConversation(urlConversationId);
    } else if (!urlConversationId && conversationId) {
      startNewConversation();
    }
  }, [urlConversationId, isAuthLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Haptic feedback when assistant response completes or errors
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev === "streaming" && status === "ready") {
      haptics.success();
    }
  }, [status, haptics]);

  useEffect(() => {
    if (error) haptics.error();
  }, [error, haptics]);

  // Notify sidebar when conversations change
  useEffect(() => {
    if (conversationId) {
      window.dispatchEvent(new CustomEvent("conversations-updated"));
    }
  }, [conversationId]);

  // Convert UIMessage (parts-based) to ChatMessage (content-based) for rendering
  const messages: ChatMessage[] = useMemo(() => {
    return aiMessages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: getTextFromParts(m.parts as Array<{ type: string; text?: string }>),
      attachments: messageAttachments[m.id],
      createdAt: new Date(),
    }));
  }, [aiMessages, messageAttachments]);

  // Detect reasoning state from the last assistant message
  const lastAiMessage = aiMessages[aiMessages.length - 1];
  const isReasoning =
    isLoading &&
    lastAiMessage?.role === "assistant" &&
    hasActiveReasoning(lastAiMessage.parts as Array<{ type: string; text?: string }>) &&
    !getTextFromParts(lastAiMessage.parts as Array<{ type: string; text?: string }>);

  // Show typing indicator when loading but assistant hasn't started streaming yet
  const showTyping =
    !isReasoning &&
    isLoading &&
    (messages.length === 0 ||
      messages[messages.length - 1]?.role === "user");

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // Scroll on every message update — instant during streaming to avoid jank
  useEffect(() => {
    scrollToBottom(status === "ready");
  }, [messages, isLoading, scrollToBottom, status]);

  const handleSend = (content: string, attachments: Attachment[]) => {
    haptics.light();
    sendMessage(content, attachments.length > 0 ? attachments : undefined);
  };

  const handleNewConversation = () => {
    haptics.selection();
    startNewConversation();
  };

  // Disable agent switching once a conversation is active
  const canSwitchAgent = !conversationId && messages.length === 0;
  const isEmpty = messages.length === 0 && !isLoading;

  const greeting = fullName
    ? tChat("greetingWithName", { name: fullName.split(" ")[0] })
    : tChat("greetingDefault");

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col overflow-hidden">
      {/* Minimal header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <AgentSelector
            selectedAgentId={agentId}
            onSelectAgent={selectAgent}
            disabled={!canSwitchAgent}
          />
        </div>

        {/* New chat button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewConversation}
          title={tChat("newChat")}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">{tChat("newChat")}</span>
        </Button>
      </div>

      {isEmpty ? (
        /* ChatGPT-style empty state: centered greeting + input */
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <Sparkles className="mb-4 size-10 text-primary" />
          <h1 className="mb-4 text-3xl font-semibold text-foreground">
            {greeting}
          </h1>
          <div className="mb-8 w-full max-w-3xl">
            <UpgradeBanner variant="inline" />
          </div>
          <div className="w-full max-w-3xl">
            <ChatInput onSend={handleSend} disabled={isLoading} centered />
          </div>
        </div>
      ) : (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl py-2">
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}
              {showTyping && <TypingIndicator />}
              {isReasoning && <ReasoningIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Processing indicators */}
          {isProcessingFiles && (
            <div className="px-4 py-2 text-center text-sm text-muted-foreground animate-pulse">
              {tChat("processingFiles")}
            </div>
          )}
          {isTranscribing && (
            <div className="px-4 py-2 text-center text-sm text-muted-foreground animate-pulse">
              {tChat("transcribing")}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="px-4 py-2 text-center text-sm text-destructive">
              {tChat("errorGeneric")}
            </div>
          )}

          {/* File error display */}
          {fileError && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{fileError}</span>
              <button
                type="button"
                onClick={clearFileError}
                className="shrink-0 rounded-full p-0.5 hover:bg-destructive/20"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </>
      )}
    </div>
  );
}
