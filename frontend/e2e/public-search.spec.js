const { test, expect } = require("@playwright/test");

const SEARCH_FIXTURE = {
  meta: { total: 1, count: 1, offset: 0, limit: 20 },
  items: [
    {
      id: 1,
      title: "Test Apartment",
      address: "Athens",
      type: "APARTMENT",
      size: 55,
      price: 650,
      status: "AVAILABLE",
    },
  ],
};

const DETAILS_FIXTURE = {
  id: 1,
  title: "Test Apartment",
  address: "Athens",
  type: "APARTMENT",
  size: 55,
  price: 650,
  status: "AVAILABLE",
};

test("@smoke P0: public search loads results and navigates to details", async ({ page }) => {
  await page.route("**/properties/search?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SEARCH_FIXTURE),
    });
  });

  await page.route("**/properties/1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DETAILS_FIXTURE),
    });
  });

  await page.goto("/search");

  await expect(page.getByRole("heading", { name: "Αναζήτηση Ακινήτου" })).toBeVisible();
  await expect(page.getByText("Test Apartment")).toBeVisible();

  await page.getByRole("link", { name: "Προβολή" }).click();

  await expect(page).toHaveURL(/\/search\/properties\/1$/);
  await expect(page.getByRole("heading", { name: "Λεπτομέρειες Ακινήτου" })).toBeVisible();
  await expect(page.getByText("Test Apartment")).toBeVisible();
  await expect(page.getByText("Athens")).toBeVisible();
});

