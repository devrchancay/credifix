import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should redirect root to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/");

    // Should be redirected to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test("should have working theme toggle on sign-in page", async ({ page }) => {
    await page.goto("/sign-in");

    // Find and click the theme toggle button
    const themeToggle = page.locator('button:has([class*="lucide-sun"])');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();

      // Dropdown should appear
      const darkOption = page.getByRole("menuitem", { name: /dark/i });
      await expect(darkOption).toBeVisible();

      await darkOption.click();

      // HTML should have dark class
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
  });
});
