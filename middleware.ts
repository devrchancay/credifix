import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/invite",
];

function isPublicRoute(pathname: string): boolean {
  // Strip locale prefix if present (e.g. /es/sign-in -> /sign-in)
  const strippedPath = pathname.replace(/^\/(en|es)/, "") || "/";

  return publicPaths.some((route) => {
    if (route === "/") return strippedPath === "/";
    return strippedPath.startsWith(route);
  });
}

function isIgnoredByIntl(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname === "/docs" ||
    pathname.startsWith("/auth/callback")
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Skip i18n for API routes and docs
  if (isIgnoredByIntl(pathname)) {
    return response;
  }

  // Run intl middleware
  const intlResponse = intlMiddleware(request);

  // Copy Supabase auth cookies to the intl response
  response.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  // Redirect root to sign-in or dashboard
  const strippedPath = pathname.replace(/^\/(en|es)/, "") || "/";
  if (strippedPath === "/") {
    const locale = pathname.match(/^\/(en|es)/)?.[1] || "en";
    if (user) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    } else {
      return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
    }
  }

  // Protect non-public routes
  if (!isPublicRoute(pathname) && !user) {
    const locale = pathname.match(/^\/(en|es)/)?.[1] || "en";
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
