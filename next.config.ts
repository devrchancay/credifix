import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Supabase domain for CSP connect-src (extracted from env at build time)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";
const supabaseDomain = new URL(supabaseUrl).origin;

// Content Security Policy directives
const cspDirectives = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for inline scripts (hydration) and 'unsafe-eval' for dev
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  // Tailwind + shadcn/ui + Swagger UI use inline styles
  "style-src 'self' 'unsafe-inline'",
  // Google Fonts are downloaded at build time by next/font, but fallback needs the domain
  "font-src 'self' data:",
  // Images from self and data URIs (blob for file previews)
  "img-src 'self' data: blob:",
  // API calls to Supabase and Stripe
  `connect-src 'self' ${supabaseDomain} wss://${new URL(supabaseUrl).host} https://api.stripe.com https://api.openai.com`,
  // No iframes except self (Swagger UI)
  "frame-src 'self'",
  // No object/embed
  "object-src 'none'",
  // Base URI restriction
  "base-uri 'self'",
  // Form submissions only to self
  "form-action 'self'",
  // Block mixed content
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig: NextConfig = {
  // PPR is now enabled via cacheComponents in Next.js 16+
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
