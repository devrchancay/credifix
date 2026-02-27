"use client";

import { useEffect, useState, useCallback } from "react";
import { Bot, Crown, Loader2 } from "lucide-react";

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
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (agents.length <= 1) {
    return null;
  }

  return (
    <div className="flex gap-2 px-4 py-3 border-b">
      {agents.map((agent) => {
        const isSelected = selectedAgentId === agent.id;
        const isPremium = agent.tier === "premium";

        return (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent.id)}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              isSelected
                ? isPremium
                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-primary bg-primary/10 text-primary"
                : "border-transparent hover:bg-muted/50 text-muted-foreground"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {isPremium ? (
              <Crown className="size-4" />
            ) : (
              <Bot className="size-4" />
            )}
            <span className="font-medium">{agent.name}</span>
          </button>
        );
      })}
    </div>
  );
}
