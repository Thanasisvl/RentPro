const { test, expect } = require("@playwright/test");
const { setAuthToken } = require("./utils");

test("@smoke protected routes redirect to /login when unauthenticated", async ({ page }) => {
  await page.goto("/properties");
  await expect(page).toHaveURL(/\/login$/);
});

test("@smoke role-based /app redirect works for TENANT", async ({ page }) => {
  await setAuthToken(page, { role: "TENANT", username: "tenant1" });

  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/tenant$/);
});

test("@smoke role-based /app redirect works for OWNER", async ({ page }) => {
  await setAuthToken(page, { role: "OWNER", username: "owner1" });

  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/owner$/);
});

test("@smoke role-based /app redirect works for ADMIN", async ({ page }) => {
  await setAuthToken(page, { role: "ADMIN", username: "admin1" });

  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/admin$/);
});

