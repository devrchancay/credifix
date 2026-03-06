import {
  streamText,
  type UIMessage,
  convertToModelMessages,
} from "ai";
import { openaiProvider } from "@/lib/ai/config";
import { getAgent, getDefaultAgent } from "@/lib/ai/agents";
import { getAIConfigFromAgent } from "@/lib/ai/config";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  checkUsageLimit,
  incrementUsage,
  createUsageLimitResponse,
} from "@/lib/api/usage-limits";
import { createAdminClient } from "@/lib/supabase/admin";

/** Extract text content from a UIMessage's parts */
function getTextFromMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }
    const { userId } = authResult;

    // Rate limit by userId
    const rateLimited = await checkRateLimit("chat", userId);
    if (rateLimited) return rateLimited;

    // Daily usage limit check
    const usageCheck = await checkUsageLimit(userId, "messages");
    if (!usageCheck.allowed) {
      return createUsageLimitResponse(usageCheck, "messages");
    }

    // 2. Parse body
    const body = await request.json();
    const {
      messages: uiMessages,
      conversationId,
      agentId,
      attachments,
    } = body as {
      messages: UIMessage[];
      conversationId?: string;
      agentId?: string;
      attachments?: Array<{
        id: string;
        name: string;
        type: "file" | "audio";
        size: number;
        duration?: number;
      }>;
    };

    if (!uiMessages || uiMessages.length === 0) {
      return createErrorResponse(
        "Messages are required",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Limit message history to prevent token overflow and cost abuse
    const MAX_MESSAGES = 100;
    if (uiMessages.length > MAX_MESSAGES) {
      return createErrorResponse(
        `Too many messages (max ${MAX_MESSAGES})`,
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 3. Resolve agent: use provided agentId, or look up from conversation, or use default
    const supabase = createAdminClient();
    let resolvedAgentId = agentId;

    if (!resolvedAgentId && conversationId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("agent_id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();
      resolvedAgentId = conv?.agent_id ?? undefined;
    }

    let agent;
    if (resolvedAgentId) {
      agent = await getAgent(resolvedAgentId);
    }
    if (!agent) {
      agent = await getDefaultAgent();
    }

    if (!agent) {
      return createErrorResponse(
        "No agent available",
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }

    // Verify the agent is allowed for the user's plan
    {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      let planId = sub?.plan_id ?? null;

      if (!planId) {
        const { data: freePlan } = await supabase
          .from("plans")
          .select("id")
          .eq("slug", "free")
          .single();
        planId = freePlan?.id ?? null;
      }

      if (planId) {
        // Check if plan has any agent mappings
        const { data: planAgents } = await supabase
          .from("plan_agents")
          .select("agent_id")
          .eq("plan_id", planId);

        // Only enforce if plan_agents has entries (backward compat)
        if (planAgents && planAgents.length > 0) {
          const allowed = planAgents.some((pa) => pa.agent_id === agent.id);
          if (!allowed) {
            return createErrorResponse(
              "This agent is not available for your plan",
              403,
              ErrorCodes.FORBIDDEN
            );
          }
        }
      }
    }

    const aiConfig = getAIConfigFromAgent(agent);

    // 4. Get or create conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const firstUserMsg = uiMessages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? getTextFromMessage(firstUserMsg).slice(0, 100)
        : "New conversation";

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title, agent_id: agent.id })
        .select("id")
        .single();

      if (convError || !conversation) {
        return createErrorResponse(
          "Failed to create conversation",
          500,
          ErrorCodes.INTERNAL_ERROR
        );
      }
      activeConversationId = conversation.id;
    } else {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", activeConversationId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .single();

      if (!existing) {
        return createErrorResponse(
          "Conversation not found",
          404,
          ErrorCodes.NOT_FOUND
        );
      }
    }

    // 5. Persist the latest user message
    const lastMsg = uiMessages[uiMessages.length - 1];
    if (lastMsg && lastMsg.role === "user") {
      await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: getTextFromMessage(lastMsg),
        attachments: attachments || [],
      });

      // Increment daily message usage
      await incrementUsage(userId, "messages");
    }

    // 6. Build attachment context for all attachment types
    let attachmentContext = "";
    if (attachments && attachments.length > 0) {
      const descriptions: string[] = [];

      for (const a of attachments) {
        if (a.type === "audio") {
          descriptions.push(
            `- Audio message: ${a.name}, duration: ${a.duration || "unknown"}s`
          );
        } else {
          descriptions.push(
            `- File: ${a.name} (${(a.size / 1024).toFixed(1)} KB)`
          );
        }
      }

      if (descriptions.length > 0) {
        attachmentContext = `\n\nThe user has attached the following files:\n${descriptions.join("\n")}\nThe file contents have been extracted and included in the user's message. Acknowledge these attachments and analyze their contents in your response.`;
      }
    }

    // 7. Inject current date/time context
    const now = new Date();
    const dateContext = `\n\nCurrent date and time: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. Use this information when the user asks about dates, times, schedules, or anything time-sensitive.`;

    // 8. Inject tool instructions
    let knowledgeContext =
      "\n\nYou have access to web search. ONLY use it for topics directly related to credit improvement, credit repair, credit scores, credit bureaus, financial regulations (FCRA, FDCPA), debt management, and credit-related services in the United States. Do NOT use web search for unrelated topics. If the user asks something outside of credit improvement, answer from your own knowledge without searching.";
    if (aiConfig.vectorStoreId) {
      knowledgeContext +=
        "\n\nIMPORTANT: You also have access to a knowledge base via the file_search tool. ALWAYS use it to search for relevant information before answering user questions. Base your responses on the knowledge base content and cite sources when possible.";
    }

    // 9. Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(uiMessages);

    // 10. Stream the response
    // GPT-5 and o-series models don't support temperature/topP/maxOutputTokens
    const isReasoningModel =
      aiConfig.model.startsWith("o") ||
      aiConfig.model.startsWith("gpt-5");

    // Build tools: always include web_search, optionally file_search
    const tools: Record<string, ReturnType<typeof openaiProvider.tools.webSearch> | ReturnType<typeof openaiProvider.tools.fileSearch>> = {
      web_search: openaiProvider.tools.webSearch({
        searchContextSize: "medium",
      }),
    };
    if (aiConfig.vectorStoreId) {
      tools.file_search = openaiProvider.tools.fileSearch({
        vectorStoreIds: [aiConfig.vectorStoreId],
      });
    }

    const finalConversationId = activeConversationId;
    const streamResult = streamText({
      model: openaiProvider(aiConfig.model),
      system: aiConfig.systemPrompt + dateContext + knowledgeContext + attachmentContext,
      messages: modelMessages,
      ...(isReasoningModel
        ? {}
        : {
            temperature: aiConfig.temperature,
            topP: aiConfig.topP,
            maxOutputTokens: aiConfig.maxTokens,
          }),
      tools,
      async onFinish({ text, usage }) {
        await supabase.from("messages").insert({
          conversation_id: finalConversationId,
          role: "assistant",
          content: text,
          tokens_used: usage?.totalTokens || null,
        });

        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", finalConversationId);
      },
    });

    // 10. Return streaming response with conversationId header
    const response = streamResult.toUIMessageStreamResponse();
    response.headers.set("X-Conversation-Id", activeConversationId);
    response.headers.set("X-Agent-Id", agent.id);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
