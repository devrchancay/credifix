"use client";

import { useTranslations } from "next-intl";
import { MessageSquare, Paperclip, Clock } from "lucide-react";
import Link from "next/link";
import type { UsageBucket } from "@/lib/api/types";

function getColor(percent: number): string {
  if (percent >= 100) return "text-destructive";
  if (percent >= 85) return "text-destructive";
  if (percent >= 60) return "text-yellow-600 dark:text-yellow-500";
  return "text-muted-foreground";
}

function getBarColor(percent: number): string {
  if (percent >= 100) return "bg-destructive";
  if (percent >= 85) return "bg-destructive";
  if (percent >= 60) return "bg-yellow-500";
  return "bg-primary";
}

function Bucket({
  icon: Icon,
  label,
  bucket,
  percent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  bucket: UsageBucket;
  percent: number;
}) {
  const color = getColor(percent);
  const barColor = getBarColor(percent);
  const clampedPercent = Math.min(percent, 100);

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`size-3.5 shrink-0 ${color}`} />
      <span className={`text-xs tabular-nums ${color}`}>
        {label}
      </span>
      <div className="h-1 w-12 rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}

export function UsageIndicator({
  messages,
  files,
  resetAt,
  messagePercent,
  filePercent,
  isMessageLimitReached,
}: {
  messages: UsageBucket;
  files: UsageBucket;
  resetAt: string | null;
  messagePercent: number;
  filePercent: number;
  isMessageLimitReached: boolean;
}) {
  const t = useTranslations("creditAnalysis.usage");

  if (messages.limit === 0 && files.limit === 0) return null;

  const resetTime = resetAt
    ? new Date(resetAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="px-4 pb-1">
      {isMessageLimitReached ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm">
          <p className="font-medium text-destructive">
            {t("limitReached", { type: t("messages") })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("limitReachedDescription", {
              limit: messages.limit,
              type: t("messages"),
              resetTime: resetTime ?? "00:00",
            })}
          </p>
          <Link
            href="/pricing"
            className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
          >
            {t("upgradePrompt")}
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <Bucket
            icon={MessageSquare}
            label={t("messagesCounter", {
              used: messages.used,
              limit: messages.limit,
            })}
            bucket={messages}
            percent={messagePercent}
          />
          <Bucket
            icon={Paperclip}
            label={t("filesCounter", {
              used: files.used,
              limit: files.limit,
            })}
            bucket={files}
            percent={filePercent}
          />
          {resetTime && (messagePercent >= 60 || filePercent >= 60) && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {t("resetsAt", { time: resetTime })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
