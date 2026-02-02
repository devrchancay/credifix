import { z } from "zod";

export const createCheckoutSchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
  interval: z.enum(["monthly", "yearly"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  platform: z.enum(["web", "mobile"]).optional(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
  configuration: z.string().startsWith("bpc_").optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
