"use client";

import { useState, useEffect } from "react";
import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";

export function TypingIndicator() {
  const t = useTranslations("creditAnalysis.chat");
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3000),
      setTimeout(() => setPhase(2), 8000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const phaseText = phase === 0
    ? t("thinking")
    : phase === 1
      ? t("thinkingLong")
      : t("thinkingVeryLong");

  return (
    <div className="flex gap-4 px-4 py-5">
      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground dark:bg-foreground/10">
        <Bot className="size-4" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 py-2">
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
        </div>
        <p className="text-xs text-muted-foreground animate-in fade-in duration-300">
          {phaseText}
        </p>
      </div>
    </div>
  );
}
