"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Paperclip,
  Mic,
  MicOff,
  ArrowUp,
  X,
  FileText,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "./chat-message";
import { useTranslations } from "next-intl";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type ChatInputProps = {
  onSend: (message: string, attachments: Attachment[]) => void;
  disabled?: boolean;
  centered?: boolean;
};

export function ChatInput({ onSend, disabled, centered }: ChatInputProps) {
  const t = useTranslations("creditAnalysis.chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setFileError(null);

    const oversized = Array.from(files).filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      const names = oversized.map((f) => f.name).join(", ");
      setFileError(t("fileSizeError", { files: names, limit: "10MB" }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: "file" as const,
      size: file.size,
      url: URL.createObjectURL(file),
      blob: file,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.url) URL.revokeObjectURL(att.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const duration = recordingDuration;

        setAttachments((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: `audio-${new Date().toISOString().slice(11, 19)}.webm`,
            type: "audio",
            size: blob.size,
            url,
            duration,
            blob,
          },
        ]);

        stream.getTracks().forEach((track) => track.stop());
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Microphone access denied - silently handle
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className={cn(
      "px-4 pb-2 pt-3",
      !centered && "border-t bg-background/80 backdrop-blur-sm"
    )}>
      <div className="mx-auto max-w-3xl">
        {fileError && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{fileError}</span>
            <button
              type="button"
              onClick={() => setFileError(null)}
              className="shrink-0 rounded-full p-0.5 hover:bg-destructive/20"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-sm"
              >
                {att.type === "audio" ? (
                  <Mic className="size-3.5 text-muted-foreground" />
                ) : (
                  <FileText className="size-3.5 text-muted-foreground" />
                )}
                <span className="max-w-[150px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isRecording && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900 dark:bg-red-950/30">
            <div className="size-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {t("recording")} {formatTime(recordingDuration)}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={stopRecording}
              className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Square className="size-3" />
              {t("stopRecording")}
            </Button>
          </div>
        )}

        {/* Input box */}
        <div className="relative rounded-2xl border bg-muted/30 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/20">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pb-12 pt-3.5 text-base placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
          />

          {/* Bottom toolbar */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title={t("attachFile")}
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled}
                className={cn(
                  "rounded-full text-muted-foreground hover:text-foreground",
                  isRecording && "text-red-500 hover:text-red-600"
                )}
                title={isRecording ? t("stopRecording") : t("recordAudio")}
              >
                {isRecording ? (
                  <MicOff className="size-4" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
            </div>

            <Button
              size="icon-sm"
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-full"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
