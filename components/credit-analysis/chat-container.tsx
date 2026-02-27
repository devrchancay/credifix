"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChatMessageBubble, type ChatMessage, type Attachment } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { Bot, FileSearch } from "lucide-react";

function getSimulatedResponse(
  t: (key: string) => string,
  hasFiles: boolean,
  hasAudio: boolean
): string {
  if (hasAudio) return t("creditAnalysis.responses.audioReceived");
  if (hasFiles) return t("creditAnalysis.responses.fileReceived");

  const generalResponses = [
    t("creditAnalysis.responses.analyzing"),
    t("creditAnalysis.responses.recommendation"),
  ];
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
}

function createGreeting(t: (key: string) => string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: t("creditAnalysis.responses.greeting"),
    createdAt: new Date(),
  };
}

export function ChatContainer() {
  const t = useTranslations();
  const tChat = useTranslations("creditAnalysis.chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createGreeting(t)]);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = (content: string, attachments: Attachment[]) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    const hasFiles = attachments.some((a) => a.type === "file");
    const hasAudio = attachments.some((a) => a.type === "audio");

    // Simulate assistant response
    setTimeout(() => {
      const response = getSimulatedResponse(t, hasFiles, hasAudio);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

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

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Bot className="size-12 opacity-30" />
            <p className="text-sm">{tChat("emptyState")}</p>
          </div>
        ) : (
          <div className="py-2">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
