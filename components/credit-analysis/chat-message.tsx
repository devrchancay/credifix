"use client";

import { cn } from "@/lib/utils";
import { Bot, User, FileText, Mic } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type MessageRole = "user" | "assistant";

export type Attachment = {
  id: string;
  name: string;
  type: "file" | "audio";
  size: number;
  url?: string;
  duration?: number;
  blob?: Blob;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  createdAt: Date;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.type === "audio") {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-sm">
        <Mic className="size-4 text-muted-foreground" />
        <span className="truncate max-w-[200px]">{attachment.name}</span>
        {attachment.duration && (
          <span className="text-muted-foreground text-xs">
            {formatDuration(attachment.duration)}
          </span>
        )}
        {attachment.url && (
          <audio controls className="h-8 max-w-[200px]">
            <source src={attachment.url} />
          </audio>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-sm">
      <FileText className="size-4 text-muted-foreground" />
      <span className="truncate max-w-[200px]">{attachment.name}</span>
      <span className="text-muted-foreground text-xs">
        {formatFileSize(attachment.size)}
      </span>
    </div>
  );
}

/** Strip embedded file content markers from user messages for cleaner display */
function cleanUserContent(content: string): string {
  // Remove [File: name]...[End of name] blocks
  let cleaned = content.replace(
    /\[File: [^\]]+\]\n[\s\S]*?\[End of [^\]]+\]/g,
    ""
  );
  // Remove [Image attached: ...] markers
  cleaned = cleaned.replace(/\[Image attached: [^\]]+\]/g, "");
  // Remove [Audio]: ... markers
  cleaned = cleaned.replace(/\[Audio\]: .*/g, "");
  // Remove [Audio message could not be transcribed]
  cleaned = cleaned.replace(
    /\[Audio message could not be transcribed\]/g,
    ""
  );
  return cleaned.trim();
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "mt-1 flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-foreground/5 text-foreground dark:bg-foreground/10"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {(() => {
          const displayContent = isUser
            ? cleanUserContent(message.content)
            : message.content;
          if (!displayContent) return null;

          if (isUser) {
            return (
              <div className="rounded-2xl rounded-tr-md bg-primary/10 px-4 py-3 text-base leading-relaxed text-foreground dark:bg-primary/15">
                <p className="whitespace-pre-wrap">{displayContent}</p>
              </div>
            );
          }

          return (
            <div className="text-base leading-7 text-foreground">
              <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-7 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-headings:my-3 prose-headings:font-semibold prose-pre:my-3 prose-pre:bg-foreground/5 prose-pre:rounded-xl prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-strong:font-semibold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayContent}
                </ReactMarkdown>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
