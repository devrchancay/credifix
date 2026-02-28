"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  Trash2,
  FileText,
  Database,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface KnowledgeFile {
  id: string;
  filename: string;
  fileSize: number;
  status: "processing" | "completed" | "failed";
  createdAt: number;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface KnowledgeBaseManagerProps {
  agentId: string;
}

export function KnowledgeBaseManager({ agentId }: KnowledgeBaseManagerProps) {
  const t = useTranslations("admin.aiSettings");
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasVectorStore, setHasVectorStore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/knowledge-base`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setFiles(data.files);
      setHasVectorStore(data.hasVectorStore ?? false);
    } catch {
      setHasVectorStore(false);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Poll processing files
  useEffect(() => {
    const processingFiles = files.filter((f) => f.status === "processing");

    if (processingFiles.length > 0 && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        for (const file of processingFiles) {
          try {
            const res = await fetch(
              `/api/admin/agents/${agentId}/knowledge-base/${file.id}`
            );
            if (!res.ok) continue;
            const data = await res.json();
            if (data.file.status !== "processing") {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === file.id ? { ...f, status: data.file.status } : f
                )
              );
            }
          } catch {
            // Ignore polling errors
          }
        }
      }, 3000);
    }

    if (processingFiles.length === 0 && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [files, agentId]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/agents/${agentId}/knowledge-base/init`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initialize");
      }
      setHasVectorStore(true);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize");
    } finally {
      setIsInitializing(false);
    }
  };

  const uploadFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      fileList.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/admin/agents/${agentId}/knowledge-base`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload");
      }

      const data = await res.json();
      setFiles((prev) => [...data.files, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    await uploadFiles(Array.from(selectedFiles));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    await uploadFiles(droppedFiles);
  };

  const handleDelete = async (fileId: string) => {
    setDeletingIds((prev) => new Set(prev).add(fileId));

    try {
      const res = await fetch(`/api/admin/agents/${agentId}/knowledge-base/${fileId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      setError("Failed to delete file");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const statusBadge = (status: KnowledgeFile["status"]) => {
    switch (status) {
      case "processing":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {t("statusProcessing")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="border-green-500 text-green-600">
            {t("statusCompleted")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            {t("statusFailed")}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasVectorStore) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Database className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            {t("noVectorStore")}
          </p>
          <Button onClick={handleInitialize} disabled={isInitializing}>
            {isInitializing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            {t("initKnowledgeBase")}
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const totalSize = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{files.length}</p>
            <p className="text-xs text-muted-foreground">{t("totalFiles")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
            <p className="text-xs text-muted-foreground">{t("totalSize")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">
              {files.filter((f) => f.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground">{t("filesReady")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>{t("uploadFiles")}</CardTitle>
          <CardDescription>{t("acceptedFormats")}</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.docx,.json,.csv,.html"
            onChange={handleUpload}
            className="hidden"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isUploading) fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed py-8 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Upload className="mr-2 h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {isUploading ? t("uploading") : t("dropFilesHere")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Files list */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("filesList")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)} &middot;{" "}
                        {new Date(file.createdAt * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(file.status)}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingIds.has(file.id)}
                    >
                      {deletingIds.has(file.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
