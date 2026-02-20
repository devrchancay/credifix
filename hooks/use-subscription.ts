"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createApiClient, ApiError } from "@/lib/api/client";
import type { SubscriptionData } from "@/lib/api/types";

const apiClient = createApiClient();

export function useSubscription() {
  const { userId, isLoaded } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await apiClient.getSubscription();
      setSubscription(response.subscription);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setSubscription(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch subscription");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    fetchSubscription();
  }, [isLoaded, fetchSubscription]);

  const plan: string = subscription?.plan ?? "free";

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
    isPro: subscription?.status === "active" && plan !== "free",
    plan,
  };
}
