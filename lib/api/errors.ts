import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "./types";

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  STRIPE_ERROR: "STRIPE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: ErrorCode
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createErrorResponse(
  message: string,
  status: number,
  code?: ErrorCode
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: message, code }, { status });
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error("API Error:", error);

  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.statusCode, error.code);
  }

  // Handle Stripe errors
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    typeof (error as { type: string }).type === "string" &&
    (error as { type: string }).type.startsWith("Stripe")
  ) {
    const stripeError = error as { message?: string };
    return createErrorResponse(
      stripeError.message || "Stripe error occurred",
      400,
      ErrorCodes.STRIPE_ERROR
    );
  }

  return createErrorResponse(
    "Internal server error",
    500,
    ErrorCodes.INTERNAL_ERROR
  );
}
