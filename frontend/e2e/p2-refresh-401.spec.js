const { test, expect } = require("@playwright/test");
const { setAuthToken, fakeJwt, corsHeaders, fulfillCorsOptions } = require("./utils");

test("@p2 refresh token on 401 and retry request", async ({ page }) => {
  await setAuthToken(page, { sub: "owner1", role: "OWNER", exp: 9999999999 });

  let propertiesCalls = 0;

  const handleProperties = async (route, request) => {
    // Never intercept the SPA document/navigation.
    if (request.resourceType() === "document") return route.fallback();

    if (request.method() === "OPTIONS") {
      return fulfillCorsOptions(route, request);
    }
    if (request.method() !== "GET") return route.fallback();

    propertiesCalls += 1;

    if (propertiesCalls === 1) {
      return route.fulfill({
        status: 401,
        headers: corsHeaders(request),
        contentType: "application/json",
        body: JSON.stringify({ detail: "Unauthorized" }),
      });
    }

    return route.fulfill({
      status: 200,
      headers: corsHeaders(request),
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 101,
          title: "P-101",
          status: "AVAILABLE",
          city: "Athens",
          address: "Street 1",
          rent_price: 500,
          size_sqm: 50,
        },
      ]),
    });
  };

  // The app requests the list via `/properties/` (trailing slash).
  await page.route("**/properties/", handleProperties);
  await page.route("**/properties/?*", handleProperties);

  await page.route("**/auth/refresh", async (route, request) => {
    if (request.resourceType() === "document") return route.fallback();
    if (request.method() === "OPTIONS") {
      return fulfillCorsOptions(route, request);
    }
    if (request.method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 200,
      headers: corsHeaders(request),
      contentType: "application/json",
      body: JSON.stringify({
        access_token: fakeJwt({ sub: "owner1", role: "OWNER", exp: 9999999999 }),
        token_type: "bearer",
      }),
    });
  });

  await page.goto("/properties");

  // If refresh+retry works, we eventually see our stubbed property.
  await expect(page.getByText("P-101")).toBeVisible();
});

