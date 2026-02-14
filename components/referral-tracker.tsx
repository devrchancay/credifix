"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

export function ReferralTracker() {
  const { userId, isLoaded } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || called.current) return;
    called.current = true;

    fetch("/api/v1/referral/register", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        console.log("[REFERRAL TRACKER]", data);
      })
      .catch(() => {
        called.current = false;
      });
  }, [isLoaded, userId]);

  return null;
}
