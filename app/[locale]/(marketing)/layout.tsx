import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isSignedIn = !!user;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">{t("appName")}</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/pricing"
                className="transition-colors hover:text-foreground/80"
              >
                {t("pricing")}
              </Link>
              <Link
                href="/about"
                className="transition-colors hover:text-foreground/80"
              >
                {t("about")}
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <ThemeToggle />
            {isSignedIn ? (
              <Button asChild>
                <Link href="/dashboard">{t("dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/sign-in">{t("signIn")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">{t("getStarted")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground">
            {tNav("builtWith")}
          </p>
        </div>
      </footer>
    </div>
  );
}
