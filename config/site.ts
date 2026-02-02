export const siteConfig = {
  name: "FHS Template",
  description: "A production-ready SaaS boilerplate with Next.js 15, Clerk, Supabase, and Stripe",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    twitter: "https://twitter.com/yourhandle",
    github: "https://github.com/yourrepo",
  },
  creator: "Florida Hitech Services",
};

export type SiteConfig = typeof siteConfig;
