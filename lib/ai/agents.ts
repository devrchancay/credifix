import { createAdminClient } from "@/lib/supabase/admin";

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: "basic" | "premium";
  isActive: boolean;
  systemPrompt: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  vectorStoreId: string | null;
  assistantId: string | null;
}

interface AgentRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string;
  is_active: boolean;
  system_prompt: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  vector_store_id: string | null;
  assistant_id: string | null;
}

function mapRow(row: AgentRow): Agent {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    tier: row.tier as "basic" | "premium",
    isActive: row.is_active,
    systemPrompt: row.system_prompt,
    model: row.model,
    temperature: row.temperature,
    topP: row.top_p,
    maxTokens: row.max_tokens,
    vectorStoreId: row.vector_store_id,
    assistantId: row.assistant_id,
  };
}

export async function getAgent(id: string): Promise<Agent | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  return data ? mapRow(data as AgentRow) : null;
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("slug", slug)
    .single();

  return data ? mapRow(data as AgentRow) : null;
}

export async function listActiveAgents(): Promise<Agent[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("is_active", true)
    .order("tier", { ascending: true })
    .order("name", { ascending: true });

  return (data ?? []).map((row) => mapRow(row as AgentRow));
}

export async function listAllAgents(): Promise<Agent[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .order("tier", { ascending: true })
    .order("name", { ascending: true });

  return (data ?? []).map((row) => mapRow(row as AgentRow));
}

/** Get the default agent (first active basic agent) */
export async function getDefaultAgent(): Promise<Agent | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("is_active", true)
    .eq("tier", "basic")
    .limit(1)
    .single();

  return data ? mapRow(data as AgentRow) : null;
}
