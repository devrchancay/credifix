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
import { Loader2, RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";

interface AIConfigData {
  id: string;
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

const DEFAULT_SYSTEM_PROMPT = `You are a professional credit analysis assistant for Credifix. Your role is to help users understand and improve their credit profiles.

Your capabilities:
- Analyze credit report information shared by users
- Explain credit scoring factors (payment history, credit utilization, length of credit history, new credit, credit mix)
- Provide actionable recommendations to improve credit scores
- Answer questions about credit repair strategies
- Explain the impact of different financial decisions on credit scores
- Help users understand their rights under the Fair Credit Reporting Act (FCRA)

Guidelines:
- Always be professional, empathetic, and encouraging
- Never guarantee specific credit score improvements
- Recommend users verify information with their official credit reports
- If users share file attachments, acknowledge them and provide analysis based on the metadata
- Respond in the same language the user writes in (English or Spanish)
- Keep responses concise but thorough
- When discussing specific numbers or timelines, note they are estimates
- When information from the knowledge base is relevant, use it to provide accurate answers and cite the source

You are NOT a licensed financial advisor. Always recommend users consult with qualified professionals for specific financial decisions.`;

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

export function AIConfigEditor() {
  const t = useTranslations("admin.aiSettings");
  const [config, setConfig] = useState<AIConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1);
  const [maxTokens, setMaxTokens] = useState(4096);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-config");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const cfg = data.config as AIConfigData;
      setConfig(cfg);
      setSystemPrompt(cfg.system_prompt);
      setModel(cfg.model);
      setTemperature(cfg.temperature);
      setTopP(cfg.top_p);
      setMaxTokens(cfg.max_tokens);
    } catch {
      setSaveMessage({ type: "error", text: t("configError") });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          model,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setConfig(data.config);
      setSaveMessage({ type: "success", text: t("configSaved") });
    } catch {
      setSaveMessage({ type: "error", text: t("configError") });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleResetPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPrompt}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("resetToDefault")}
            </Button>
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
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>{t("vectorStore")}</CardTitle>
          </CardHeader>
          <CardContent>
            {config.vector_store_id ? (
              <p className="text-sm text-muted-foreground">
                Vector Store ID: <code className="rounded bg-muted px-1.5 py-0.5">{config.vector_store_id}</code>
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
      {config?.updated_at && (
        <p className="text-xs text-muted-foreground">
          {t("lastUpdated")}: {new Date(config.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
