export const siteConfig = {
  name: "Credit Helper",
  description:
    "Credit Helper by Florida Hitech Services — AI-powered credit analysis and repair assistant. Monitor your credit score, get personalized recommendations, and improve your credit profile.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    website: "https://floridahitech.com",
  },
  creator: "Florida Hitech Services INC",
};

export type SiteConfig = typeof siteConfig;
