"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

const REFERRAL_STORAGE_KEY = "referral_code";

export function ReferralTracker() {
  const { userId, isLoaded } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    console.log("[REFERRAL TRACKER] Effect running - isLoaded:", isLoaded, "userId:", userId, "called:", called.current);

    if (!isLoaded || !userId || called.current) return;

    const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
    console.log("[REFERRAL TRACKER] localStorage referral_code:", code);

    if (!code) {
      console.log("[REFERRAL TRACKER] No code in localStorage, skipping");
      return;
    }

    called.current = true;
    console.log("[REFERRAL TRACKER] Calling /api/v1/referral/register with code:", code);

    fetch("/api/v1/referral/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("[REFERRAL TRACKER] API response:", data);
        if (data.registered) {
          localStorage.removeItem(REFERRAL_STORAGE_KEY);
          console.log("[REFERRAL TRACKER] Code removed from localStorage");
        }
      })
      .catch((err) => {
        console.error("[REFERRAL TRACKER] API error:", err);
        called.current = false;
      });
  }, [isLoaded, userId]);

  return null;
}
