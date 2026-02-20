"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

export function useUser() {
  const { user, isLoaded, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    setIsProfileLoaded(true);
    fetchedRef.current = userId;
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate: updating loading state when auth state changes
      setIsProfileLoaded(true);
      return;
    }

    if (fetchedRef.current !== user.id) {
      fetchProfile(user.id);
    }
  }, [user, isLoaded, isSignedIn, fetchProfile]);

  return {
    user,
    profile,
    isLoaded: isLoaded && isProfileLoaded,
    isSignedIn,
    fullName:
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      null,
    email: profile?.email || user?.email || null,
    role: profile?.role ?? "user",
  };
}
