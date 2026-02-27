"use client";

import { useState } from "react";
import { AgentList } from "./agent-list";
import { AIConfigEditor } from "./ai-config-editor";
import { KnowledgeBaseManager } from "./knowledge-base-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

export function AgentSettingsView() {
  const t = useTranslations("admin.aiSettings");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Left: Agent list */}
      <div>
        <AgentList
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
          }}
          onCreateAgent={() => {}}
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
    </div>
  );
}
