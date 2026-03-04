"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChatMessageBubble, type ChatMessage, type Attachment } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { AgentSelector } from "./agent-selector";
import { ChatHistory } from "./chat-history";
import { AlertCircle, History, Plus, PanelLeftClose, PanelLeft, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useChatAI } from "@/hooks/use-chat-ai";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
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
    conversations,
    loadConversation,
    startNewConversation,
    isLoadingConversations,
    deleteConversation,
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

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setMobileSheetOpen(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setMobileSheetOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
  };

  // Disable agent switching once a conversation is active
  const canSwitchAgent = !conversationId && messages.length === 0;
  const isEmpty = messages.length === 0 && !isLoading;

  const greeting = fullName
    ? tChat("greetingWithName", { name: fullName.split(" ")[0] })
    : tChat("greetingDefault");

  const historyPanel = (
    <ChatHistory
      conversations={conversations}
      currentConversationId={conversationId}
      isLoading={isLoadingConversations}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
    />
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 overflow-hidden">
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden border-r transition-all duration-200 md:block",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
        )}
      >
        {sidebarOpen && historyPanel}
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="left" className="w-80 p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>{tChat("history")}</SheetTitle>
          </SheetHeader>
          {historyPanel}
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Minimal header */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          {/* History toggle - desktop */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden md:inline-flex"
            onClick={() => setSidebarOpen((prev) => !prev)}
            title={tChat("history")}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
          </Button>

          {/* History toggle - mobile */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileSheetOpen(true)}
            title={tChat("history")}
          >
            <History className="size-4" />
          </Button>

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
            <h1 className="mb-8 text-3xl font-semibold text-foreground">
              {greeting}
            </h1>
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
    </div>
  );
}
