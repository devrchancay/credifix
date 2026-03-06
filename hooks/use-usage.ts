"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createApiClient, ApiError } from "@/lib/api/client";
import type { UsageBucket } from "@/lib/api/types";

const apiClient = createApiClient();

export function useUsage() {
  const { userId, isLoaded } = useAuth();
  const [messages, setMessages] = useState<UsageBucket>({ used: 0, limit: 0 });
  const [files, setFiles] = useState<UsageBucket>({ used: 0, limit: 0 });
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiClient.getUsage();
      setMessages(data.messages);
      setFiles(data.files);
      setResetAt(data.resetAt);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        // Not authenticated, keep defaults
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchUsage();
  }, [isLoaded, fetchUsage]);

  const messagePercent =
    messages.limit > 0 ? Math.round((messages.used / messages.limit) * 100) : 0;
  const filePercent =
    files.limit > 0 ? Math.round((files.used / files.limit) * 100) : 0;

  return {
    messages,
    files,
    resetAt,
    isLoading,
    refetch: fetchUsage,
    isMessageLimitReached: messages.limit > 0 && messages.used >= messages.limit,
    isFileLimitReached: files.limit > 0 && files.used >= files.limit,
    messagePercent,
    filePercent,
  };
}
