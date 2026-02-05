const { test, expect } = require("@playwright/test");
const { setAuthToken, corsHeaders, fulfillCorsOptions } = require("./utils");

function getSearchParam(url, key) {
  try {
    const u = new URL(url);
    return u.searchParams.get(key);
  } catch {
    return null;
  }
}

test("@p2 admin users page loads and role filter reloads", async ({ page }) => {
  await setAuthToken(page, { sub: "admin1", role: "ADMIN", exp: 9999999999 });

  await page.route("**/users/?*", async (route, request) => {
    if (request.method() === "OPTIONS") {
      return fulfillCorsOptions(route, request);
    }
    if (request.method() !== "GET") {
      return route.fulfill({
        status: 405,
        headers: { ...corsHeaders(request), "content-type": "application/json" },
        body: JSON.stringify({ detail: "method not allowed" }),
      });
    }

    const role = getSearchParam(request.url(), "role");
    const q = getSearchParam(request.url(), "q");

    // Basic sanity: filters should come through as query params.
    if (q && q !== "john") {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "unexpected q" }),
      });
    }

    if (role === "OWNER") {
      return route.fulfill({
        status: 200,
        headers: { ...corsHeaders(request), "x-total-count": "1" },
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 2,
            username: "owner1",
            full_name: "Owner One",
            email: "owner1@example.com",
            role: "OWNER",
          },
        ]),
      });
    }

    // Default initial load: mixed roles.
    return route.fulfill({
      status: 200,
      headers: { ...corsHeaders(request), "x-total-count": "2" },
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 1,
          username: "admin1",
          full_name: "Admin One",
          email: "admin1@example.com",
          role: "ADMIN",
        },
        {
          id: 2,
          username: "owner1",
          full_name: "Owner One",
          email: "owner1@example.com",
          role: "OWNER",
        },
      ]),
    });
  });

  await page.goto("/app/admin/users");

  await expect(page.getByText("Χρήστες")).toBeVisible();
  await expect(page.getByText("Σύνολο: 2")).toBeVisible();
  await expect(page.getByRole("cell", { name: "admin1", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Διαχειριστής" })).toBeVisible();

  // Apply role filter -> should reload and show only OWNER.
  await page.getByRole("combobox", { name: "Ρόλος" }).click();
  await page.getByRole("option", { name: "OWNER" }).click();
  await page.getByRole("button", { name: "Αναζήτηση" }).click();

  await expect(page.getByText("Σύνολο: 1")).toBeVisible();
  await expect(page.getByRole("cell", { name: "owner1", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Ιδιοκτήτης" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "admin1", exact: true })).toHaveCount(0);
});

