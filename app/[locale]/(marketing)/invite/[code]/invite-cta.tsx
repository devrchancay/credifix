"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const REFERRAL_STORAGE_KEY = "referral_code";

interface Props {
  code: string;
  signUpUrl: string;
  label: string;
}

export function InviteCta({ code, signUpUrl, label }: Props) {
  // Save referral code to localStorage as soon as the page loads
  useEffect(() => {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  }, [code]);

  const router = useRouter();

  const handleClick = () => {
    // Ensure it's saved before navigating
    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
    router.push(signUpUrl);
  };

  return (
    <Button size="lg" className="w-full" onClick={handleClick}>
      {label}
    </Button>
  );
}
