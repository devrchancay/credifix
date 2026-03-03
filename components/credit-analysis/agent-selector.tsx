"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Crown, Lock, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (agents.length <= 1) {
    return null;
  }

  return (
    <div className="flex gap-1.5 border-b px-4 py-2.5">
      {agents.map((agent) => {
        const isSelected = selectedAgentId === agent.id;
        const isPremium = agent.tier === "premium";
        const isLocked = isPremium && !isPro;

        const handleClick = () => {
          if (isLocked) {
            router.push(`/${locale}/billing`);
            return;
          }
          onSelectAgent(agent.id);
        };

        return (
          <button
            key={agent.id}
            onClick={handleClick}
            disabled={disabled && !isLocked}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isLocked
                ? "cursor-pointer text-muted-foreground/60 hover:text-muted-foreground"
                : isSelected
                  ? isPremium
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50",
              disabled && !isLocked && "cursor-not-allowed opacity-50"
            )}
          >
            {isLocked ? (
              <Lock className="size-3.5" />
            ) : isPremium ? (
              <Crown className="size-3.5" />
            ) : (
              <Bot className="size-3.5" />
            )}
            <span>{agent.name}</span>
            {isLocked && (
              <span className="text-xs">
                {tAgents("locked")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
