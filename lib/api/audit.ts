import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "sync"
  | "upload"
  | "config_change";

export type AuditResourceType =
  | "agent"
  | "plan"
  | "user_role"
  | "ai_config"
  | "credit_config"
  | "knowledge_file"
  | "billing_sync";

/**
 * Record an admin action in the audit log.
 * Fire-and-forget — never blocks the request.
 */
export function logAdminAction(params: {
  userId: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): void {
  const supabase = createAdminClient();

  supabase
    .from("audit_logs")
    .insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      details: (params.details ?? {}) as import("@/types/database").Json,
      ip_address: params.ip ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("Failed to write audit log:", error.message);
      }
    });
}
