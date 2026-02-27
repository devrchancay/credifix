"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, FileText, Mic } from "lucide-react";

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
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
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
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
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
        "flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="mt-0.5 shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-2",
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
          return displayContent ? (
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                isUser
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}
            >
              <p className="whitespace-pre-wrap">{displayContent}</p>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
