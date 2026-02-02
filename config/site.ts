export const siteConfig = {
  name: "Credifix",
  description: "Credifix is a platform for monitoring and managing your credit score",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    twitter: "https://twitter.com/credifix",
    github: "https://github.com/credifix",
  },
  creator: "Credifix",
};

export type SiteConfig = typeof siteConfig;
