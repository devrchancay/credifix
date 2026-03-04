"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Crown, Lock, Loader2, ChevronDown, Check } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgentOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: "basic" | "premium";
}

interface AgentSelectorProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  disabled?: boolean;
}

export function AgentSelector({
  selectedAgentId,
  onSelectAgent,
  disabled,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isPro } = useSubscription();
  const router = useRouter();
  const locale = useLocale();
  const tAgents = useTranslations("creditAnalysis.agents");

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/agents");
      if (!res.ok) return;
      const data = await res.json();
      setAgents(data.agents);

      // Auto-select first agent if none selected
      if (!selectedAgentId && data.agents.length > 0) {
        onSelectAgent(data.agents[0].id);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgentId, onSelectAgent]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedName = selectedAgent?.name ?? tAgents("selectAgent");

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1.5">
        <Loader2 className="size-4 animate-spin" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="gap-1.5 text-base font-semibold"
        >
          {selectedAgent?.tier === "premium" ? (
            <Crown className="size-4" />
          ) : (
            <Bot className="size-4" />
          )}
          {selectedName}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const isPremium = agent.tier === "premium";
          const isLocked = isPremium && !isPro;

          return (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => {
                if (isLocked) {
                  router.push(`/${locale}/billing`);
                  return;
                }
                onSelectAgent(agent.id);
              }}
              className={cn(
                "flex items-start gap-3 py-2.5",
                isLocked && "opacity-60"
              )}
            >
              <div className="mt-0.5">
                {isLocked ? (
                  <Lock className="size-4" />
                ) : isPremium ? (
                  <Crown className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{agent.name}</div>
                {agent.description && (
                  <div className="text-xs text-muted-foreground">
                    {agent.description}
                  </div>
                )}
                {isLocked && (
                  <div className="text-xs text-muted-foreground">
                    {tAgents("locked")}
                  </div>
                )}
              </div>
              {isSelected && <Check className="mt-0.5 size-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
