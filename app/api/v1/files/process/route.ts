import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import {
  createErrorResponse,
  handleApiError,
  ErrorCodes,
} from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  checkUsageLimit,
  incrementUsage,
  createUsageLimitResponse,
} from "@/lib/api/usage-limits";
import { processFile, MAX_FILE_SIZE } from "@/lib/ai/file-processing";
import type { ProcessedFile } from "@/lib/ai/file-processing";

const MAX_FILES = 5;

export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return createErrorResponse("Unauthorized", 401, ErrorCodes.UNAUTHORIZED);
    }

    const rateLimited = await checkRateLimit("upload", authResult.userId);
    if (rateLimited) return rateLimited;

    // Daily usage limit check
    const usageCheck = await checkUsageLimit(authResult.userId, "files");
    if (!usageCheck.allowed) {
      return createUsageLimitResponse(usageCheck, "files");
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return createErrorResponse(
        "No files provided",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (files.length > MAX_FILES) {
      return createErrorResponse(
        `Maximum ${MAX_FILES} files allowed per request`,
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate sizes before processing
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return createErrorResponse(
          `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    const results: ProcessedFile[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const processed = await processFile(buffer, file.name, file.type);
      results.push(processed);
    }

    // Increment daily file usage
    await incrementUsage(authResult.userId, "files", results.length);

    return NextResponse.json({ files: results });
  } catch (error) {
    return handleApiError(error);
  }
}
