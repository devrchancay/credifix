"use client";

import { useState, useEffect, useCallback } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

interface AgentData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: "basic" | "premium";
  is_active: boolean;
  system_prompt: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  vector_store_id: string | null;
  assistant_id: string | null;
  updated_at: string;
  updated_by: string | null;
}

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const TIERS = [
  { value: "basic", label: "Basic" },
  { value: "premium", label: "Premium" },
];

interface AIConfigEditorProps {
  agentId: string;
}

export function AIConfigEditor({ agentId }: AIConfigEditorProps) {
  const t = useTranslations("admin.aiSettings");
  const tAgents = useTranslations("admin.agents");
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState("basic");
  const [isActive, setIsActive] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1);
  const [maxTokens, setMaxTokens] = useState(4096);

  const loadAgent = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const a = data.agent as AgentData;
      setAgent(a);
      setSlug(a.slug);
      setName(a.name);
      setDescription(a.description || "");
      setTier(a.tier);
      setIsActive(a.is_active);
      setSystemPrompt(a.system_prompt);
      setModel(a.model);
      setTemperature(a.temperature);
      setTopP(a.top_p);
      setMaxTokens(a.max_tokens);
    } catch {
      setSaveMessage({ type: "error", text: t("configError") });
    } finally {
      setIsLoading(false);
    }
  }, [agentId, t]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          description: description || null,
          tier,
          is_active: isActive,
          system_prompt: systemPrompt,
          model,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      setAgent(data.agent);
      setSaveMessage({ type: "success", text: t("configSaved") });
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : t("configError"),
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
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
    <div className="space-y-6">
      {/* Agent Identity */}
      <Card>
        <CardHeader>
          <CardTitle>{tAgents("agentIdentity")}</CardTitle>
          <CardDescription>{tAgents("agentIdentityDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tAgents("agentName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tAgents("agentNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{tAgents("agentSlug")}</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="credit-analysis-basic"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tAgents("agentDescription")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tAgents("agentDescriptionPlaceholder")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tAgents("agentTier")}</Label>
              <Select value={tier} onValueChange={setTier}>
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
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="agent-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border accent-primary"
              />
              <Label htmlFor="agent-active">{tAgents("agentActive")}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>{t("systemPrompt")}</CardTitle>
          <CardDescription>{t("systemPromptDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            className="w-full resize-y rounded-md border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("systemPromptPlaceholder")}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {systemPrompt.length} {t("characters")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("modelSettings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("model")}</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("maxTokens")}</Label>
              <Input
                type="number"
                min={256}
                max={16384}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t("temperature")}: {temperature}
              </Label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 ({t("precise")})</span>
                <span>2 ({t("creative")})</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {t("topP")}: {topP}
              </Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={topP}
                onChange={(e) => setTopP(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>1</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vector Store Info */}
      {agent && (
        <Card>
          <CardHeader>
            <CardTitle>{t("vectorStore")}</CardTitle>
          </CardHeader>
          <CardContent>
            {agent.vector_store_id ? (
              <p className="text-sm text-muted-foreground">
                Vector Store ID:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  {agent.vector_store_id}
                </code>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("noVectorStore")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t("saveConfig")}
        </Button>

        {saveMessage && (
          <span
            className={`text-sm ${saveMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
          >
            {saveMessage.text}
          </span>
        )}
      </div>

      {/* Last updated */}
      {agent?.updated_at && (
        <p className="text-xs text-muted-foreground">
          {t("lastUpdated")}: {new Date(agent.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
