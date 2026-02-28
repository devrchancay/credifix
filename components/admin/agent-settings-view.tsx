"use client";

import { useState } from "react";
import { AgentList } from "./agent-list";
import { AIConfigEditor } from "./ai-config-editor";
import { KnowledgeBaseManager } from "./knowledge-base-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

const TIERS = [
  { value: "basic", label: "Basic" },
  { value: "premium", label: "Premium" },
];

export function AgentSettingsView() {
  const t = useTranslations("admin.aiSettings");
  const tAgents = useTranslations("admin.agents");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTier, setNewTier] = useState("basic");

  const resetCreateForm = () => {
    setNewName("");
    setNewSlug("");
    setNewDescription("");
    setNewTier("basic");
    setCreateError(null);
  };

  const handleCreateAgent = async () => {
    if (!newName.trim() || !newSlug.trim()) {
      setCreateError(tAgents("requiredFields"));
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim().toLowerCase(),
          description: newDescription.trim() || null,
          tier: newTier,
          is_active: true,
          system_prompt: "You are a helpful assistant.",
          model: "gpt-4o",
          temperature: 0.7,
          top_p: 1,
          max_tokens: 4096,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create agent");
      }

      const data = await res.json();
      setShowCreateDialog(false);
      resetCreateForm();
      setRefreshKey((k) => k + 1);
      setSelectedAgentId(data.agent.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setNewName(value);
    if (!newSlug || newSlug === slugify(newName)) {
      setNewSlug(slugify(value));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Left: Agent list */}
      <div>
        <AgentList
          key={refreshKey}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
          }}
          onCreateAgent={() => {
            resetCreateForm();
            setShowCreateDialog(true);
          }}
        />
      </div>

      {/* Right: Config + Knowledge base for selected agent */}
      <div>
        {selectedAgentId ? (
          <Tabs defaultValue="config">
            <TabsList>
              <TabsTrigger value="config">{t("configTab")}</TabsTrigger>
              <TabsTrigger value="knowledge">
                {t("knowledgeBaseTab")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-6">
              <AIConfigEditor key={selectedAgentId} agentId={selectedAgentId} />
            </TabsContent>

            <TabsContent value="knowledge" className="mt-6">
              <KnowledgeBaseManager
                key={selectedAgentId}
                agentId={selectedAgentId}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            {t("selectAgentPrompt")}
          </div>
        )}
      </div>

      {/* Create Agent Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tAgents("newAgent")}</DialogTitle>
            <DialogDescription>{tAgents("createAgentDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{tAgents("agentName")}</Label>
              <Input
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={tAgents("agentNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{tAgents("agentSlug")}</Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
                placeholder="credit-analysis-basic"
              />
            </div>
            <div className="space-y-2">
              <Label>{tAgents("agentDescription")}</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={tAgents("agentDescriptionPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{tAgents("agentTier")}</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map((tierOption) => (
                    <SelectItem key={tierOption.value} value={tierOption.value}>
                      {tierOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              {tAgents("cancel")}
            </Button>
            <Button onClick={handleCreateAgent} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tAgents("createAgent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
