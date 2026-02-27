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

    // Sign-in form should be visible
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("should display sign-up page correctly", async ({ page }) => {
    await page.goto("/sign-up");

    // Sign-up form should be visible
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("should allow navigation to sign-up from sign-in", async ({ page }) => {
    await page.goto("/sign-in");

    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await signUpLink.click();

    await expect(page).toHaveURL(/sign-up/);
  });

  test("should redirect root to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/");

    // Should be redirected to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });
});
