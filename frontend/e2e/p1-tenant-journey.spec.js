const { test, expect } = require("@playwright/test");
const { setAuthToken } = require("./utils");

test("@p1 TENANT: submit preferences then view recommendations", async ({ page }) => {
  await setAuthToken(page, { role: "TENANT", username: "tenant1" });

  // Preferences submit endpoints
  await page.route("**/preference-profiles/me", async (route) => {
    const req = route.request();
    if (req.method() === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({ status: 405, body: "Method not allowed" });
  });

  await page.route("**/preference-profiles/me/pairwise-comparisons", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({ status: 405, body: "Method not allowed" });
  });

  // Recommendations data
  await page.route("**/recommendations", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          meta: {
            criteria_order: ["price", "size", "property_type", "area_score"],
            is_benefit: [false, true, true, true],
            cr_threshold: 0.1,
            available_properties_total: 1,
            ranked_properties_count: 1,
            missing_area_score_count: 0,
          },
          items: [
            {
              score: 0.75,
              property: {
                id: 1,
                title: "Reco Apartment",
                address: "Athens",
                type: "APARTMENT",
                size: 55,
                price: 650,
                status: "AVAILABLE",
              },
              explain: {
                ahp: {
                  cr: 0.01,
                  weights: { price: 0.4, size: 0.3, property_type: 0.2, area_score: 0.1 },
                },
                topsis: {
                  criteria_values: { price: 650, size: 55, property_type: 1, area_score: 7.5 },
                },
              },
            },
          ],
        }),
      });
    }
    return route.fulfill({ status: 405, body: "Method not allowed" });
  });

  await page.goto("/preferences");
  await expect(page.getByRole("heading", { name: "Προτιμήσεις" })).toBeVisible();

  await page.getByRole("button", { name: "Υποβολή προτιμήσεων" }).click();

  await expect(page).toHaveURL(/\/recommendations$/);
  await expect(page.getByRole("heading", { name: "Προτάσεις" })).toBeVisible();
  await expect(page.getByText("Reco Apartment")).toBeVisible();
});

