import {
  streamText,
  type UIMessage,
  type ModelMessage,
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

type FileContent =
  | { kind: "text"; name: string; mimeType: string; content: string }
  | {
      kind: "image";
      name: string;
      mimeType: string;
      base64: string;
      mediaType: string;
    };

/** Extract text content from a UIMessage's parts */
function getTextFromMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Build file context string from processed text files */
function buildFileTextContext(files: FileContent[]): string {
  const textFiles = files.filter((f) => f.kind === "text");
  if (textFiles.length === 0) return "";

  const sections = textFiles.map(
    (f) =>
      `--- File: ${f.name} ---\n${f.content}\n--- End of ${f.name} ---`
  );

  return "\n\n" + sections.join("\n\n");
}

/** Build image content parts for multimodal messages */
function buildImageParts(
  files: FileContent[]
): Array<{ type: "image"; image: string; mimeType: string }> {
  return files
    .filter(
      (f): f is Extract<FileContent, { kind: "image" }> => f.kind === "image"
    )
    .map((f) => ({
      type: "image" as const,
      image: f.base64,
      mimeType: f.mediaType,
    }));
}

/** Inject file content into the last user message of model messages */
function injectFileContent(
  modelMessages: ModelMessage[],
  fileContents: FileContent[]
): ModelMessage[] {
  if (!fileContents || fileContents.length === 0) return modelMessages;

  const textContext = buildFileTextContext(fileContents);
  const imageParts = buildImageParts(fileContents);

  // Find the last user message and augment it
  const result = [...modelMessages];
  for (let i = result.length - 1; i >= 0; i--) {
    const msg = result[i];
    if (msg.role === "user") {
      // Get current content parts
      const currentContent = Array.isArray(msg.content)
        ? msg.content
        : [{ type: "text" as const, text: msg.content as string }];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newContent: any[] = [];

      // Add existing text content with file context appended
      for (const part of currentContent) {
        if (part.type === "text") {
          newContent.push({
            type: "text",
            text: part.text + textContext,
          });
        } else {
          // Preserve existing non-text parts (images, files, etc.)
          newContent.push(part);
        }
      }

      // Add image parts
      for (const imgPart of imageParts) {
        newContent.push(imgPart);
      }

      result[i] = { ...msg, content: newContent };
      break;
    }
  }

  return result;
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
      fileContents,
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
      fileContents?: FileContent[];
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

    // 6. Build attachment context for non-processed files
    let attachmentContext = "";
    if (attachments && attachments.length > 0) {
      const unprocessedAttachments = attachments.filter((a) => {
        // Skip files that were processed (their content is in fileContents)
        if (a.type === "file" && fileContents?.some((f) => f.name === a.name)) {
          return false;
        }
        return true;
      });

      if (unprocessedAttachments.length > 0) {
        const fileDescriptions = unprocessedAttachments
          .map((a) => {
            if (a.type === "audio") {
              return `[Audio message: ${a.name}, duration: ${a.duration || "unknown"}s]`;
            }
            return `[File attached: ${a.name}, size: ${a.size} bytes]`;
          })
          .join("\n");
        attachmentContext = `\n\nThe user has attached the following files:\n${fileDescriptions}\nAcknowledge these attachments in your response.`;
      }
    }

    // 7. Convert UIMessages to model messages and inject file content
    let modelMessages = await convertToModelMessages(uiMessages);

    if (fileContents && fileContents.length > 0) {
      modelMessages = injectFileContent(modelMessages, fileContents);
    }

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
