"use client";

import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-4 px-4 py-5">
      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground dark:bg-foreground/10">
        <Bot className="size-4" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
