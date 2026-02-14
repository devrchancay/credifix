import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/",
  "/:locale",
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/:locale/pricing(.*)",
  "/:locale/about(.*)",
  "/:locale/invite/(.*)",
  "/invite/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/about(.*)",
  "/api/(.*)",
  "/docs",
]);

// Routes that should skip i18n middleware
const isIgnoredByIntl = createRouteMatcher([
  "/api/(.*)",
  "/docs",
]);

export default clerkMiddleware(async (auth, request) => {
  // Skip i18n for API routes and docs
  if (isIgnoredByIntl(request)) {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return;
  }

  // Run intl middleware for other routes
  const intlResponse = intlMiddleware(request);

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return intlResponse;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
