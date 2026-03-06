import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ErrorCodes } from "./errors";

// ---------- Types ----------

export type UsageType = "messages" | "files";

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string;
}

interface PlanLimits {
  messages_daily: number;
  files_daily: number;
}

// ---------- Defaults ----------

const DEFAULT_LIMITS: PlanLimits = { messages_daily: 15, files_daily: 5 };
const TTL_SECONDS = 48 * 60 * 60; // 48 hours

// ---------- Redis ----------

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ---------- Helpers ----------

function getDateKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
}

function redisKey(type: UsageType, userId: string, dateKey: string): string {
  const prefix = type === "messages" ? "msgs" : "files";
  return `usage:${prefix}:${userId}:${dateKey}`;
}

function getResetAt(): string {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return tomorrow.toISOString();
}

// ---------- Plan resolution ----------

export async function getUserPlanLimits(
  userId: string
): Promise<PlanLimits> {
  try {
    const supabase = createAdminClient();

    // Get active subscription with plan limits via join
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .limit(1)
      .maybeSingle();

    let planLimits: Record<string, unknown> | null = null;

    if (sub?.plan_id) {
      const { data: plan } = await supabase
        .from("plans")
        .select("limits")
        .eq("id", sub.plan_id)
        .single();
      planLimits = (plan?.limits ?? null) as Record<string, unknown> | null;
    }

    // Fallback to free plan
    if (!planLimits) {
      const { data: freePlan } = await supabase
        .from("plans")
        .select("limits")
        .eq("slug", "free")
        .single();
      planLimits = (freePlan?.limits ?? null) as Record<string, unknown> | null;
    }

    return {
      messages_daily:
        typeof planLimits?.messages_daily === "number"
          ? planLimits.messages_daily
          : DEFAULT_LIMITS.messages_daily,
      files_daily:
        typeof planLimits?.files_daily === "number"
          ? planLimits.files_daily
          : DEFAULT_LIMITS.files_daily,
    };
  } catch {
    return DEFAULT_LIMITS;
  }
}

// ---------- Core functions ----------

/** Check whether a user is within their daily limit. Does NOT increment. */
export async function checkUsageLimit(
  userId: string,
  type: UsageType
): Promise<UsageCheckResult> {
  try {
    const [planLimits, dateKey] = await Promise.all([
      getUserPlanLimits(userId),
      Promise.resolve(getDateKey()),
    ]);

    const limit =
      type === "messages" ? planLimits.messages_daily : planLimits.files_daily;

    const key = redisKey(type, userId, dateKey);
    const used = ((await redis.get<number>(key)) ?? 0);
    const resetAt = getResetAt();

    return { allowed: used < limit, used, limit, resetAt };
  } catch {
    // Fail-open: if Redis is unavailable, allow the request
    return { allowed: true, used: 0, limit: 0, resetAt: getResetAt() };
  }
}

/** Increment usage counter after a successful action. */
export async function incrementUsage(
  userId: string,
  type: UsageType,
  count: number = 1
): Promise<void> {
  try {
    const dateKey = getDateKey();
    const key = redisKey(type, userId, dateKey);

    if (count === 1) {
      const newVal = await redis.incr(key);
      // Set TTL only on first increment
      if (newVal === 1) {
        await redis.expire(key, TTL_SECONDS);
      }
    } else {
      const newVal = await redis.incrby(key, count);
      if (newVal === count) {
        await redis.expire(key, TTL_SECONDS);
      }
    }
  } catch {
    // Fail-open: silently ignore
  }
}

/** Get current usage counts for the frontend. */
export async function getUsageCounts(userId: string) {
  try {
    const dateKey = getDateKey();
    const planLimits = await getUserPlanLimits(userId);

    const [msgsUsed, filesUsed] = await Promise.all([
      redis.get<number>(redisKey("messages", userId, dateKey)),
      redis.get<number>(redisKey("files", userId, dateKey)),
    ]);

    return {
      messages: { used: msgsUsed ?? 0, limit: planLimits.messages_daily },
      files: { used: filesUsed ?? 0, limit: planLimits.files_daily },
      resetAt: getResetAt(),
    };
  } catch {
    // Fail-open: return zeros
    const planLimits = DEFAULT_LIMITS;
    return {
      messages: { used: 0, limit: planLimits.messages_daily },
      files: { used: 0, limit: planLimits.files_daily },
      resetAt: getResetAt(),
    };
  }
}

/** Return a 429 response when the daily limit is reached. */
export function createUsageLimitResponse(
  result: UsageCheckResult,
  type: UsageType
) {
  const retryAfterSec = Math.ceil(
    (new Date(result.resetAt).getTime() - Date.now()) / 1000
  );

  return NextResponse.json(
    {
      error: `Daily ${type} limit reached`,
      code: ErrorCodes.DAILY_LIMIT_REACHED,
      details: {
        used: result.used,
        limit: result.limit,
        resetAt: result.resetAt,
        type,
      },
    },
    {
      status: 429,
      headers: {
        "X-Usage-Limit": result.limit.toString(),
        "X-Usage-Remaining": "0",
        "X-Usage-Reset": result.resetAt,
        "Retry-After": Math.max(retryAfterSec, 1).toString(),
      },
    }
  );
}
