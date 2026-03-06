"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useHaptics } from "@/hooks/use-haptics";

import { NavUser } from "@/components/nav-user";
import { ChatHistory } from "@/components/credit-analysis/chat-history";
import { ChatSearchModal } from "@/components/credit-analysis/chat-search-modal";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { ROLES } from "@/types/roles";
import type { ConversationSummary } from "@/hooks/use-chat-ai";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { fullName, email, role } = useUser();
  const { isPro } = useSubscription();
  const { userId, isLoaded } = useAuth();
  const t = useTranslations("common");
  const haptics = useHaptics();
  const router = useRouter();
  const pathname = usePathname();

  const userData = {
    name: fullName ?? t("user"),
    email: email ?? "",
    avatar: "",
  };

  const isAdmin = role === ROLES.ADMIN;

  // Chat history state
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (data) {
      setConversations(
        data.map((c) => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updated_at ?? "",
        }))
      );
    }
    setIsLoadingConversations(false);
  }, [userId]);

  useEffect(() => {
    if (isLoaded && userId) {
      fetchConversations();
    }
  }, [isLoaded, userId, fetchConversations]);

  // Listen for conversation changes from the chat
  useEffect(() => {
    const handler = () => fetchConversations();
    window.addEventListener("conversations-updated", handler);
    return () => window.removeEventListener("conversations-updated", handler);
  }, [fetchConversations]);

  // Get current conversation ID from URL if on credit-analysis page
  const currentConversationId = React.useMemo(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    return params.get("c") || null;
  }, [pathname]);

  const handleSelectConversation = (id: string) => {
    haptics.selection();
    router.push(`/credit-analysis?c=${id}`);
  };

  const handleNewConversation = () => {
    haptics.selection();
    router.push("/credit-analysis");
  };

  const handleDeleteConversation = async (id: string) => {
    haptics.warning();
    const supabase = createClient();
    await supabase.from("conversations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      router.push("/credit-analysis");
    }
    window.dispatchEvent(new CustomEvent("conversation-deleted", { detail: { id } }));
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              onClick={handleNewConversation}
              tooltip={t("newChat")}
            >
              <Plus className="size-4" />
              <span>{t("newChat")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              onClick={() => setSearchOpen(true)}
              tooltip={t("searchChats")}
            >
              <Search className="size-4" />
              <span>{t("searchChats")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {!isCollapsed && (
          <ChatHistory
            conversations={conversations}
            currentConversationId={currentConversationId}
            isLoading={isLoadingConversations}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} isPro={isPro} isAdmin={isAdmin} />
      </SidebarFooter>
      <SidebarRail />
      <ChatSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectConversation={handleSelectConversation}
      />
    </Sidebar>
  );
}
