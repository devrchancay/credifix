import {
  streamText,
  type UIMessage,
  convertToModelMessages,
} from "ai";
import { openaiProvider, getAIConfig } from "@/lib/ai/config";
import { getSystemPrompt } from "@/lib/ai/system-prompt";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";
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

    // 2. Parse body
    const body = await request.json();
    const {
      messages: uiMessages,
      conversationId,
      attachments,
    } = body as {
      messages: UIMessage[];
      conversationId?: string;
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

    // 3. Get or create conversation
    const supabase = createAdminClient();
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const firstUserMsg = uiMessages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? getTextFromMessage(firstUserMsg).slice(0, 100)
        : "New conversation";

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title })
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
        .single();

      if (!existing) {
        return createErrorResponse(
          "Conversation not found",
          404,
          ErrorCodes.NOT_FOUND
        );
      }
    }

    // 4. Persist the latest user message
    const lastMsg = uiMessages[uiMessages.length - 1];
    if (lastMsg && lastMsg.role === "user") {
      await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: getTextFromMessage(lastMsg),
        attachments: attachments || [],
      });
    }

    // 5. Load AI config from DB
    const [aiConfig, systemPrompt] = await Promise.all([
      getAIConfig(),
      getSystemPrompt(),
    ]);

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

    // 7. Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(uiMessages);

    // 8. Stream the response
    const finalConversationId = activeConversationId;
    const streamResult = streamText({
      model: openaiProvider(aiConfig.model),
      system: systemPrompt + attachmentContext,
      messages: modelMessages,
      temperature: aiConfig.temperature,
      topP: aiConfig.topP,
      maxOutputTokens: aiConfig.maxTokens,
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

    // 9. Return streaming response with conversationId header
    const response = streamResult.toUIMessageStreamResponse();
    response.headers.set("X-Conversation-Id", activeConversationId);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
