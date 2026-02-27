"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Bot,
  Crown,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AgentRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: "basic" | "premium";
  is_active: boolean;
  model: string;
  updated_at: string;
}

interface AgentListProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
}

export function AgentList({
  selectedAgentId,
  onSelectAgent,
  onCreateAgent,
}: AgentListProps) {
  const t = useTranslations("admin.agents");
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setAgents(data.agents);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleDelete = async (agentId: string) => {
    if (!confirm(t("confirmDelete"))) return;

    setDeletingId(agentId);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (selectedAgentId === agentId) {
        const remaining = agents.filter((a) => a.id !== agentId);
        if (remaining.length > 0) {
          onSelectAgent(remaining[0].id);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </div>
          <Button size="sm" onClick={onCreateAgent}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("newAgent")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noAgents")}
          </p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                  selectedAgentId === agent.id
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => onSelectAgent(agent.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      agent.tier === "premium"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {agent.tier === "premium" ? (
                      <Crown className="size-4" />
                    ) : (
                      <Bot className="size-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <Badge
                        variant={
                          agent.tier === "premium" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {agent.tier}
                      </Badge>
                      {!agent.is_active && (
                        <Badge variant="outline" className="text-xs">
                          {t("inactive")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {agent.slug} &middot; {agent.model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAgent(agent.id);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(agent.id);
                    }}
                    disabled={deletingId === agent.id}
                  >
                    {deletingId === agent.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
