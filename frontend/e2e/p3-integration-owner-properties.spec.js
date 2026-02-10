const { test, expect } = require("@playwright/test");

const E2E_PASSWORD = process.env.E2E_PASSWORD || "rentpro-e2e";

test("@p3 owner can login and load real /properties list", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Όνομα χρήστη").fill("owner1");
  await page.getByLabel("Κωδικός").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Σύνδεση" }).click();

  // Role-based redirect
  await expect(page).toHaveURL(/\/app\/owner$/);

  await page.goto("/properties");
  await expect(page.getByText("Ιδιοκτησίες")).toBeVisible();

  // Seeded fixtures (real backend data)
  await expect(page.getByText("E2E Seed Property", { exact: true })).toBeVisible();
});

