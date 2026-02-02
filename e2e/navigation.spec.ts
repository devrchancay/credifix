import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate between public pages", async ({ page }) => {
    // Start at home
    await page.goto("/");
    await expect(page).toHaveURL("/");

    // Go to pricing
    await page.click('a[href="/pricing"]');
    await expect(page).toHaveURL("/pricing");

    // Go to about
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL("/about");

    // Go back to home via logo
    await page.click('a[href="/"]');
    await expect(page).toHaveURL("/");
  });

  test("should have working theme toggle", async ({ page }) => {
    await page.goto("/");

    // Find and click the theme toggle button
    const themeToggle = page.locator('button:has([class*="lucide-sun"])');
    await expect(themeToggle).toBeVisible();

    await themeToggle.click();

    // Dropdown should appear
    const darkOption = page.getByRole("menuitem", { name: /dark/i });
    await expect(darkOption).toBeVisible();

    await darkOption.click();

    // HTML should have dark class
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("should have sign in and get started buttons on landing page", async ({
    page,
  }) => {
    await page.goto("/");

    // Check for auth buttons
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });
});
