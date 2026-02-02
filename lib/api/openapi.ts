import type { OpenAPIV3 } from "openapi-types";

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "FHS Template API",
    description: "REST API for billing and subscription management",
    version: "1.0.0",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      description: "Current server",
    },
  ],
  tags: [
    {
      name: "Billing",
      description: "Subscription and payment management",
    },
  ],
  paths: {
    "/api/v1/billing/checkout": {
      post: {
        tags: ["Billing"],
        summary: "Create checkout session",
        description:
          "Creates a Stripe checkout session for subscribing to a plan. Returns a URL to redirect the user to complete payment.",
        operationId: "createCheckoutSession",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateCheckoutRequest",
              },
              examples: {
                proMonthly: {
                  summary: "Subscribe to Pro monthly",
                  value: {
                    plan: "pro",
                    interval: "monthly",
                  },
                },
                enterpriseYearly: {
                  summary: "Subscribe to Enterprise yearly",
                  value: {
                    plan: "enterprise",
                    interval: "yearly",
                  },
                },
                withCustomUrls: {
                  summary: "With custom redirect URLs",
                  value: {
                    plan: "pro",
                    interval: "monthly",
                    successUrl: "https://myapp.com/success",
                    cancelUrl: "https://myapp.com/cancel",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Checkout session created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateCheckoutResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - missing or invalid authentication",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/billing/portal": {
      post: {
        tags: ["Billing"],
        summary: "Create billing portal session",
        description:
          "Creates a Stripe billing portal session where users can manage their subscription, update payment methods, and view invoices.",
        operationId: "createPortalSession",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreatePortalRequest",
              },
              examples: {
                default: {
                  summary: "Default return URL",
                  value: {},
                },
                customReturn: {
                  summary: "Custom return URL",
                  value: {
                    returnUrl: "https://myapp.com/billing",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Portal session created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreatePortalResponse",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "404": {
            description: "No active subscription found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/billing/subscription": {
      get: {
        tags: ["Billing"],
        summary: "Get current subscription",
        description:
          "Retrieves the current user's active subscription details including plan, status, and billing period.",
        operationId: "getSubscription",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Subscription retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GetSubscriptionResponse",
                },
                examples: {
                  active: {
                    summary: "Active subscription",
                    value: {
                      subscription: {
                        id: "sub_1234567890",
                        status: "active",
                        plan: "pro",
                        stripePriceId: "price_1234567890",
                        stripeCustomerId: "cus_1234567890",
                        currentPeriodStart: "2024-01-01T00:00:00Z",
                        currentPeriodEnd: "2024-02-01T00:00:00Z",
                        cancelAtPeriodEnd: false,
                      },
                    },
                  },
                  noSubscription: {
                    summary: "No active subscription",
                    value: {
                      subscription: null,
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Clerk session token. Obtain from Clerk SDK using `getToken()`.",
      },
    },
    schemas: {
      CreateCheckoutRequest: {
        type: "object",
        required: ["plan", "interval"],
        properties: {
          plan: {
            type: "string",
            enum: ["pro", "enterprise"],
            description: "The subscription plan to checkout",
          },
          interval: {
            type: "string",
            enum: ["monthly", "yearly"],
            description: "Billing interval",
          },
          successUrl: {
            type: "string",
            format: "uri",
            description: "URL to redirect after successful payment",
          },
          cancelUrl: {
            type: "string",
            format: "uri",
            description: "URL to redirect if payment is cancelled",
          },
          platform: {
            type: "string",
            enum: ["web", "mobile"],
            description: "Platform making the request (affects default redirect URLs)",
          },
        },
      },
      CreateCheckoutResponse: {
        type: "object",
        required: ["checkoutUrl", "sessionId"],
        properties: {
          checkoutUrl: {
            type: "string",
            format: "uri",
            description: "Stripe checkout URL to redirect the user",
          },
          sessionId: {
            type: "string",
            description: "Stripe checkout session ID",
          },
        },
      },
      CreatePortalRequest: {
        type: "object",
        properties: {
          returnUrl: {
            type: "string",
            format: "uri",
            description: "URL to redirect after leaving the portal",
          },
        },
      },
      CreatePortalResponse: {
        type: "object",
        required: ["portalUrl"],
        properties: {
          portalUrl: {
            type: "string",
            format: "uri",
            description: "Stripe billing portal URL",
          },
        },
      },
      GetSubscriptionResponse: {
        type: "object",
        required: ["subscription"],
        properties: {
          subscription: {
            allOf: [{ $ref: "#/components/schemas/SubscriptionData" }],
            nullable: true,
            description: "Subscription data or null if no active subscription",
          },
        },
      },
      SubscriptionData: {
        type: "object",
        required: [
          "id",
          "status",
          "plan",
          "stripePriceId",
          "stripeCustomerId",
          "cancelAtPeriodEnd",
        ],
        properties: {
          id: {
            type: "string",
            description: "Subscription ID",
          },
          status: {
            type: "string",
            enum: [
              "active",
              "canceled",
              "incomplete",
              "incomplete_expired",
              "past_due",
              "trialing",
              "unpaid",
              "paused",
            ],
            description: "Subscription status",
          },
          plan: {
            type: "string",
            enum: ["free", "pro", "enterprise"],
            description: "Plan name",
          },
          stripePriceId: {
            type: "string",
            description: "Stripe price ID",
          },
          stripeCustomerId: {
            type: "string",
            description: "Stripe customer ID",
          },
          currentPeriodStart: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Current billing period start date",
          },
          currentPeriodEnd: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Current billing period end date",
          },
          cancelAtPeriodEnd: {
            type: "boolean",
            description: "Whether subscription will cancel at period end",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
            description: "Error message",
          },
          code: {
            type: "string",
            enum: [
              "UNAUTHORIZED",
              "FORBIDDEN",
              "NOT_FOUND",
              "VALIDATION_ERROR",
              "STRIPE_ERROR",
              "INTERNAL_ERROR",
            ],
            description: "Error code",
          },
        },
      },
    },
  },
};
