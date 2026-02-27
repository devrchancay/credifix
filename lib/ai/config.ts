import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel AI SDK provider (reads OPENAI_API_KEY from env automatically)
export const openaiProvider = createOpenAI({});

// Official OpenAI SDK for Vector Store / Files management
export const openaiClient = new OpenAI();

export const DEFAULT_MODEL = "gpt-4o";

export interface AIConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  vectorStoreId: string | null;
  assistantId: string | null;
}

export async function getAIConfig(): Promise<AIConfig> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("ai_config")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      return {
        systemPrompt: data.system_prompt,
        model: data.model,
        temperature: data.temperature,
        topP: data.top_p,
        maxTokens: data.max_tokens,
        vectorStoreId: data.vector_store_id,
        assistantId: data.assistant_id,
      };
    }
  } catch {
    // Fall through to defaults
  }

  return {
    systemPrompt: "",
    model: DEFAULT_MODEL,
    temperature: 0.7,
    topP: 1,
    maxTokens: 4096,
    vectorStoreId: null,
    assistantId: null,
  };
}
