"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  return (
    <SignUp
      unsafeMetadata={ref ? { referral_code: ref } : undefined}
    />
  );
}
