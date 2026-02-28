import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // PPR is now enabled via cacheComponents in Next.js 16+
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withNextIntl(nextConfig);
