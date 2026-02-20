"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { user } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const loadedRef = useRef<string | null>(null);

  const email = user?.email ?? "";

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    setFullName(data?.full_name ?? "");
    loadedRef.current = userId;
  }, [supabase]);

  useEffect(() => {
    if (!user || loadedRef.current === user.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate: loading profile data from database
    loadProfile(user.id);
  }, [user, loadProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (authError) {
      toast.error(authError.message);
      setIsSavingProfile(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (profileError) {
      toast.error(profileError.message);
    } else {
      toast.success(t("profileUpdated"));
    }

    setIsSavingProfile(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("passwordUpdated"));
      setNewPassword("");
    }

    setIsSavingPassword(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <form onSubmit={handleUpdateProfile}>
          <CardHeader>
            <CardTitle>{t("profile")}</CardTitle>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input id="email" value={email} disabled />
              <p className="text-xs text-muted-foreground">
                {t("emailHelp")}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("save")}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleUpdatePassword}>
          <CardHeader>
            <CardTitle>{t("changePassword")}</CardTitle>
            <CardDescription>{t("passwordDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("updatePassword")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
