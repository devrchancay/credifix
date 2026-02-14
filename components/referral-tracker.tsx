"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

export function ReferralTracker() {
  const { userId, isLoaded } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || called.current) return;
    called.current = true;

    // Check if there's a referral_code cookie by calling the register endpoint.
    // If no cookie exists, the endpoint returns early with no side effects.
    fetch("/api/v1/referral/register", { method: "POST" }).catch(() => {
      // Silently ignore — not critical
    });
  }, [isLoaded, userId]);

  return null;
}
