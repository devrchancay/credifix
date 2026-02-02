"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { createApiClient, ApiError } from "@/lib/api/client";

const apiClient = createApiClient();

const PORTAL_CONFIGURATION_ID = "bpc_1SwOQ84njFveBGmwYlxQnlC0";

export function usePortal() {
  const { userId, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = useCallback(
    async (returnUrl?: string) => {
      if (!isSignedIn || !userId) {
        setError("You must be signed in to access the billing portal");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.createPortalSession({
          configuration: PORTAL_CONFIGURATION_ID,
          returnUrl,
        });

        window.location.href = response.portalUrl;
        return response.portalUrl;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to open billing portal";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isSignedIn, userId]
  );

  return {
    openPortal,
    isLoading,
    error,
    isSignedIn,
  };
}
