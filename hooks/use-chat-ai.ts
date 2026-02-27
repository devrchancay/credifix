"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/components/credit-analysis/chat-message";

export interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface ProcessedFileResult {
  kind: "text" | "image";
  name: string;
  mimeType: string;
  content?: string;
}

export function useChatAI() {
  const { userId, isLoaded } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const pendingAttachmentsRef = useRef<Attachment[]>([]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/v1/chat",
        body: {
          conversationId,
          get attachments() {
            return pendingAttachmentsRef.current.length > 0
              ? pendingAttachmentsRef.current
              : undefined;
          },
        },
      }),
    [conversationId]
  );

  const {
    messages,
    status,
    error,
    sendMessage: sdkSendMessage,
    setMessages,
  } = useChat({
    transport,
    onFinish() {
      pendingAttachmentsRef.current = [];
    },
    onError() {
      pendingAttachmentsRef.current = [];
    },
  });

  // Extract conversationId from the response headers via a fetch wrapper is not
  // straightforward in v6. Instead, we watch for new assistant messages and
  // fetch the latest conversation when we don't have one yet.
  useEffect(() => {
    if (conversationId || !userId || messages.length === 0) return;
    if (status !== "ready") return;

    // After the first exchange completes, fetch the most recent conversation
    const supabase = createClient();
    supabase
      .from("conversations")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setConversationId(data[0].id);
          loadConversations();
        }
      });
  }, [status, messages.length, conversationId, userId]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (data) {
      setConversations(
        data.map((c) => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updated_at,
        }))
      );
    }
    setIsLoadingConversations(false);
  }, [userId]);

  // Load conversation list on mount
  useEffect(() => {
    if (!isLoaded || !userId) return;
    loadConversations();
  }, [isLoaded, userId, loadConversations]);

  const loadConversation = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (data) {
        const loadedMessages: UIMessage[] = data
          .filter((m) => m.role !== "system")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: m.content }],
          }));
        setMessages(loadedMessages);
        setConversationId(id);
      }
    },
    [setMessages]
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, [setMessages]);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const transcribeAudio = useCallback(
    async (blob: Blob, name: string): Promise<string | null> => {
      const formData = new FormData();
      formData.append("file", blob, name);

      try {
        const res = await fetch("/api/v1/transcribe", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.text || null;
      } catch {
        return null;
      }
    },
    []
  );

  const processFiles = useCallback(
    async (
      files: Attachment[]
    ): Promise<ProcessedFileResult[]> => {
      const filesWithBlobs = files.filter(
        (a) => a.type === "file" && a.blob
      );
      if (filesWithBlobs.length === 0) return [];

      const formData = new FormData();
      for (const file of filesWithBlobs) {
        formData.append("files", file.blob!, file.name);
      }

      try {
        const res = await fetch("/api/v1/files/process", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.files || [];
      } catch {
        return [];
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      // Strip blobs from attachments for metadata-only transport
      const metadataAttachments = attachments?.map(
        ({ blob: _blob, ...rest }) => rest
      );

      if (metadataAttachments && metadataAttachments.length > 0) {
        pendingAttachmentsRef.current = metadataAttachments;
      }

      let messageText = content;

      // Process file attachments → extract text and inject into message
      const fileAttachments = attachments?.filter(
        (a) => a.type === "file" && a.blob
      );

      if (fileAttachments && fileAttachments.length > 0) {
        setIsProcessingFiles(true);
        try {
          const processedFiles = await processFiles(fileAttachments);
          const fileTexts = processedFiles
            .filter((f) => f.kind === "text")
            .map(
              (f) =>
                `[File: ${f.name}]\n${f.content}\n[End of ${f.name}]`
            );

          if (fileTexts.length > 0) {
            const fileSection = fileTexts.join("\n\n");
            messageText = messageText.trim()
              ? `${messageText}\n\n${fileSection}`
              : fileSection;
          }
        } finally {
          setIsProcessingFiles(false);
        }
      }

      // Transcribe audio attachments
      const audioAttachments = attachments?.filter(
        (a) => a.type === "audio" && a.blob
      );

      if (audioAttachments && audioAttachments.length > 0) {
        setIsTranscribing(true);
        try {
          const transcriptions = await Promise.all(
            audioAttachments.map((a) => transcribeAudio(a.blob!, a.name))
          );
          const validTranscriptions = transcriptions.filter(Boolean);

          if (validTranscriptions.length > 0) {
            const transcriptionText = validTranscriptions.join("\n");
            if (messageText.trim()) {
              messageText = `${messageText}\n\n[Audio]: ${transcriptionText}`;
            } else {
              messageText = transcriptionText;
            }
          } else if (!messageText.trim()) {
            messageText = "[Audio message could not be transcribed]";
          }
        } finally {
          setIsTranscribing(false);
        }
      }

      sdkSendMessage({ text: messageText });
    },
    [sdkSendMessage, transcribeAudio, processFiles]
  );

  const isLoading =
    isTranscribing ||
    isProcessingFiles ||
    status === "submitted" ||
    status === "streaming";

  return {
    messages,
    isLoading,
    isTranscribing,
    isProcessingFiles,
    status,
    conversationId,
    error,
    sendMessage,
    conversations,
    loadConversation,
    startNewConversation,
    isLoadingConversations,
  };
}
