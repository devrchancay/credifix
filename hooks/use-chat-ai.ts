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
  const [agentId, setAgentId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const pendingAttachmentsRef = useRef<Attachment[]>([]);
  const pendingDisplayAttachmentsRef = useRef<Attachment[] | null>(null);
  const lastUserMessageIdRef = useRef<string | null>(null);
  const [messageAttachments, setMessageAttachments] = useState<
    Record<string, Attachment[]>
  >({});

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/v1/chat",
        body: {
          conversationId,
          agentId,
          get attachments() {
            return pendingAttachmentsRef.current.length > 0
              ? pendingAttachmentsRef.current
              : undefined;
          },
        },
      }),
    [conversationId, agentId]
  );

  // Force useChat to recreate its internal Chat instance when transport changes
  // (AI SDK v6 stores Chat in a ref and only recreates when `id` changes)
  const chatId = useMemo(
    () => `${agentId ?? "default"}-${conversationId ?? "new"}`,
    [agentId, conversationId]
  );

  const {
    messages,
    status,
    error,
    sendMessage: sdkSendMessage,
    setMessages,
  } = useChat({
    id: chatId,
    transport,
    onFinish() {
      pendingAttachmentsRef.current = [];
    },
    onError() {
      pendingAttachmentsRef.current = [];
    },
  });

  // Associate pending attachments with new user messages for display
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    // Check for user messages, or the message before the last (in case assistant already replied)
    const lastUserMsg = lastMsg.role === "user"
      ? lastMsg
      : messages.length >= 2 && messages[messages.length - 2].role === "user"
        ? messages[messages.length - 2]
        : null;

    if (
      lastUserMsg &&
      lastUserMsg.id !== lastUserMessageIdRef.current &&
      pendingDisplayAttachmentsRef.current
    ) {
      lastUserMessageIdRef.current = lastUserMsg.id;
      const atts = pendingDisplayAttachmentsRef.current;
      pendingDisplayAttachmentsRef.current = null;
      setMessageAttachments((prev) => ({ ...prev, [lastUserMsg.id]: atts }));
    }
  }, [messages]);

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
        .select("id, role, content, attachments, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (data) {
        const attachmentsMap: Record<string, Attachment[]> = {};
        const loadedMessages: UIMessage[] = data
          .filter((m) => m.role !== "system")
          .map((m) => {
            if (
              m.attachments &&
              Array.isArray(m.attachments) &&
              m.attachments.length > 0
            ) {
              attachmentsMap[m.id] = m.attachments as unknown as Attachment[];
            }
            return {
              id: m.id,
              role: m.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: m.content }],
            };
          });
        setMessageAttachments(attachmentsMap);
        setMessages(loadedMessages);
        setConversationId(id);
      }

      // Also load the agent_id for this conversation
      const { data: convData } = await supabase
        .from("conversations")
        .select("agent_id")
        .eq("id", id)
        .single();

      if (convData?.agent_id) {
        setAgentId(convData.agent_id);
      }
    },
    [setMessages]
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setMessageAttachments({});
  }, [setMessages]);

  const deleteConversation = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (!error) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        // If deleting the active conversation, reset to new chat
        if (conversationId === id) {
          setMessages([]);
          setConversationId(null);
          setMessageAttachments({});
        }
      }
    },
    [conversationId, setMessages]
  );

  const selectAgent = useCallback(
    (newAgentId: string) => {
      // Only allow switching agents when no conversation is active
      if (!conversationId) {
        setAgentId(newAgentId);
      }
    },
    [conversationId]
  );

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

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

      const res = await fetch("/api/v1/files/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage: string;
        try {
          const data = await res.json();
          errorMessage = data.error || data.message || `Upload failed (${res.status})`;
        } catch {
          errorMessage =
            res.status === 413
              ? "File too large. Maximum size is 10MB."
              : `Upload failed (${res.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      return data.files || [];
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
        pendingDisplayAttachmentsRef.current = metadataAttachments;
      }

      let messageText = content;
      setFileError(null);

      // Process file attachments → extract text and inject into message
      const fileAttachments = attachments?.filter(
        (a) => a.type === "file" && a.blob
      );

      if (fileAttachments && fileAttachments.length > 0) {
        setIsProcessingFiles(true);
        try {
          const processedFiles = await processFiles(fileAttachments);
          const fileSections: string[] = [];

          for (const f of processedFiles) {
            if (f.kind === "text" && f.content) {
              fileSections.push(
                `[File: ${f.name}]\n${f.content}\n[End of ${f.name}]`
              );
            } else if (f.kind === "image") {
              fileSections.push(
                `[Image attached: ${f.name} (${f.mimeType})]`
              );
            }
          }

          if (fileSections.length > 0) {
            const fileSection = fileSections.join("\n\n");
            messageText = messageText.trim()
              ? `${messageText}\n\n${fileSection}`
              : fileSection;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to process files";
          setFileError(msg);
          pendingAttachmentsRef.current = [];
          pendingDisplayAttachmentsRef.current = null;
          return;
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

  const clearFileError = useCallback(() => setFileError(null), []);

  return {
    messages,
    isLoading,
    isTranscribing,
    isProcessingFiles,
    status,
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
    deleteConversation,
    isLoadingConversations,
  };
}
