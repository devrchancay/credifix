import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should redirect unauthenticated users from dashboard to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Should be redirected to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test("should display sign-in page correctly", async ({ page }) => {
    await page.goto("/sign-in");

    // Clerk sign-in component should be visible
    await expect(page.locator(".cl-signIn-root")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display sign-up page correctly", async ({ page }) => {
    await page.goto("/sign-up");

    // Clerk sign-up component should be visible
    await expect(page.locator(".cl-signUp-root")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should allow navigation to sign-up from sign-in", async ({ page }) => {
    await page.goto("/sign-in");

    // Look for the sign-up link within Clerk component
    const signUpLink = page.locator('a[href*="sign-up"]').first();
    await signUpLink.click();

    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Public Pages", () => {
  test("should display landing page", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText(/Build Your SaaS/i);
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("should display pricing page", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.locator("h1")).toContainText(/pricing/i);

    // Check that all plan cards are visible
    await expect(page.getByText("Free")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Enterprise")).toBeVisible();
  });

  test("should display about page", async ({ page }) => {
    await page.goto("/about");

    await expect(page.locator("h1")).toContainText(/about/i);
  });
});
