const { test, expect } = require("@playwright/test");
const { setAuthToken } = require("./utils");

test("@p2 owner cannot access admin users page", async ({ page }) => {
  await setAuthToken(page, { sub: "owner1", role: "OWNER", exp: 9999999999 });

  await page.goto("/app/admin/users");

  // Forbidden page copy (Greek) is stable in this app.
  await expect(page.getByText(/Μη εξουσιοδοτημένη πρόσβαση/i)).toBeVisible();
  await expect(page.getByText(/403/i)).toBeVisible();
});

