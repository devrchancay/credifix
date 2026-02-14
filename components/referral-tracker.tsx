"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

const REFERRAL_STORAGE_KEY = "referral_code";

export function ReferralTracker() {
  const { userId, isLoaded } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || called.current) return;

    const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!code) return;

    called.current = true;

    fetch("/api/v1/referral/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.registered) {
          localStorage.removeItem(REFERRAL_STORAGE_KEY);
        }
      })
      .catch(() => {
        // Silently ignore — will retry on next page load
        called.current = false;
      });
  }, [isLoaded, userId]);

  return null;
}
