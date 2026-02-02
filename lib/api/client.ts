import type {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  CreatePortalRequest,
  CreatePortalResponse,
  GetSubscriptionResponse,
  ApiErrorResponse,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const error: ApiErrorResponse = await response.json().catch(() => ({
        error: "Unknown error",
      }));
      throw new ApiError(error.error, response.status, error.code);
    }

    return response.json();
  }

  // ============================================
  // Billing Methods
  // ============================================

  async createCheckoutSession(
    params: Omit<CreateCheckoutRequest, "platform">
  ): Promise<CreateCheckoutResponse> {
    return this.fetch("/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async createPortalSession(
    params?: CreatePortalRequest
  ): Promise<CreatePortalResponse> {
    return this.fetch("/api/v1/billing/portal", {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    });
  }

  async getSubscription(): Promise<GetSubscriptionResponse> {
    return this.fetch("/api/v1/billing/subscription");
  }
}

/**
 * Creates an API client for internal web usage.
 * Uses cookies for authentication.
 */
export function createApiClient(baseUrl?: string): ApiClient {
  return new ApiClient(baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "");
}
