"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChatMessageBubble, type ChatMessage, type Attachment } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { AgentSelector } from "./agent-selector";
import { Bot, FileSearch } from "lucide-react";
import { useChatAI } from "@/hooks/use-chat-ai";

/** Extract text content from a UIMessage's parts */
function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatContainer() {
  const tChat = useTranslations("creditAnalysis.chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages: aiMessages,
    isLoading,
    isTranscribing,
    isProcessingFiles,
    conversationId,
    agentId,
    error,
    sendMessage,
    selectAgent,
    messageAttachments,
  } = useChatAI();

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

  // Show typing indicator when loading but assistant hasn't started streaming yet
  const showTyping =
    isLoading &&
    (messages.length === 0 ||
      messages[messages.length - 1]?.role === "user");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = (content: string, attachments: Attachment[]) => {
    sendMessage(content, attachments.length > 0 ? attachments : undefined);
  };

  // Disable agent switching once a conversation is active
  const canSwitchAgent = !conversationId && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-xl border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileSearch className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{tChat("assistant")}</h2>
          <p className="text-xs text-muted-foreground">{tChat("assistantDescription")}</p>
        </div>
      </div>

      {/* Agent Selector */}
      <AgentSelector
        selectedAgentId={agentId}
        onSelectAgent={selectAgent}
        disabled={!canSwitchAgent}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Bot className="size-12 opacity-30" />
            <p className="text-sm">{tChat("emptyState")}</p>
          </div>
        ) : (
          <div className="py-2">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {showTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Processing indicators */}
      {isProcessingFiles && (
        <div className="border-t px-4 py-2 text-sm text-muted-foreground animate-pulse">
          {tChat("processingFiles")}
        </div>
      )}
      {isTranscribing && (
        <div className="border-t px-4 py-2 text-sm text-muted-foreground animate-pulse">
          {tChat("transcribing")}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="border-t px-4 py-2 text-sm text-destructive">
          {tChat("errorGeneric")}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
