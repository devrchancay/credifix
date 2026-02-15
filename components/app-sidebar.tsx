"use client";

import * as React from "react";
import { CreditCard, Home, Settings, Shield, Gift } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { ROLES, type UserPublicMetadata } from "@/types/roles";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const t = useTranslations("common");

  const userData = {
    name: user?.fullName ?? user?.firstName ?? t("user"),
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    avatar: user?.imageUrl ?? "",
  };

  const metadata = user?.publicMetadata as UserPublicMetadata | undefined;
  const isAdmin = metadata?.role === ROLES.ADMIN;

  const baseNavItems = [
    {
      title: t("dashboard"),
      url: "/dashboard",
      icon: Home,
    },
    {
      title: t("settings"),
      url: "/settings",
      icon: Settings,
    },
    {
      title: t("billing"),
      url: "/billing",
      icon: CreditCard,
    },
    {
      title: t("referrals"),
      url: "/referrals",
      icon: Gift,
    },
  ];

  const adminNavItems = [
    {
      title: t("admin"),
      url: "/admin",
      icon: Shield,
      isActive: true,
      items: [
        {
          title: t("users"),
          url: "/admin",
        },
        {
          title: t("plans"),
          url: "/admin/plans",
        },
      ],
    },
  ];

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <span className="text-xs font-bold">FHS</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{t("appName")}</span>
                  <span className="truncate text-xs">{t("tagline")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
