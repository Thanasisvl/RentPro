const { test, expect } = require("@playwright/test");

const E2E_PASSWORD = process.env.E2E_PASSWORD || "rentpro-e2e";

test("@p3 admin can login and load real /app/admin/users", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Όνομα χρήστη").fill("admin1");
  await page.getByLabel("Κωδικός").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Σύνδεση" }).click();

  // Role-based redirect
  await expect(page).toHaveURL(/\/app\/admin$/);

  await page.goto("/app/admin/users");
  await expect(page.getByText("Χρήστες")).toBeVisible();

  // Seeded fixtures (real backend data)
  await expect(page.getByRole("cell", { name: "owner1", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "tenant1", exact: true })).toBeVisible();
});

