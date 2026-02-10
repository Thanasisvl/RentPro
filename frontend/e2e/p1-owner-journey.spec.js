const { test, expect } = require("@playwright/test");
const { setAuthToken } = require("./utils");

test("@p1 OWNER: create/edit property + create contract from property", async ({ page }) => {
  // Auth as OWNER (frontend only decodes role from token)
  await setAuthToken(page, { role: "OWNER", username: "owner1" });

  // Areas dictionary (required by PropertyForm)
  const areas = [{ id: 11, code: "ATHENS", name: "Αθήνα", area_score: 7.2, is_active: true }];

  // In-test “DB”
  let property = {
    id: 123,
    title: "My Place",
    description: "",
    address: "Athens",
    type: "APARTMENT",
    size: 55,
    price: 650,
    status: "AVAILABLE",
  };

  const tenants = [{ id: 20, name: "Tenant A", afm: "123" }];

  // --- API stubs (axios baseURL defaults to http://localhost:8000) ---
  await page.route("**/areas/**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(areas),
    });
  });

  await page.route("**/properties/", async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([property]),
      });
    }
    if (method === "POST") {
      const body = req.postDataJSON?.() ?? {};
      property = { ...property, ...body, id: 123 };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 123 }),
      });
    }
    return route.fulfill({ status: 405, body: "Method not allowed" });
  });

  await page.route("**/properties/123", async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(property),
      });
    }
    if (method === "PUT") {
      const body = req.postDataJSON?.() ?? {};
      property = { ...property, ...body };
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (method === "DELETE") {
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fulfill({ status: 405, body: "Method not allowed" });
  });

  await page.route("**/tenants", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(tenants),
    });
  });

  await page.route("**/contracts/", async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 5 }),
      });
    }
    // Contract list isn't needed in this journey
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  // --- Start journey ---
  await page.goto("/properties");
  await expect(page.getByRole("heading", { name: "Ιδιοκτησίες" })).toBeVisible();
  await expect(page.getByText("My Place")).toBeVisible();

  // Create new property
  await page.getByRole("link", { name: "Νέο ακίνητο" }).click();
  await expect(page).toHaveURL(/\/properties\/new$/);

  await page.getByLabel("Τίτλος").fill("My Place");
  await page.getByLabel("Διεύθυνση").fill("Athens");

  // Type select (MUI)
  await page.getByRole("combobox", { name: "Τύπος ακινήτου" }).click();
  await page.getByRole("option", { name: "Διαμέρισμα" }).click();

  await page.getByLabel("Εμβαδόν (τ.μ.)").fill("55");
  await page.getByLabel("Τιμή (€/μήνα)").fill("650");

  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page).toHaveURL(/\/properties\/123$/);
  await expect(page.getByText("My Place")).toBeVisible();

  // Edit property
  await page.getByRole("link", { name: "Επεξεργασία" }).click();
  await expect(page).toHaveURL(/\/properties\/123\/edit$/);
  await page.getByLabel("Τίτλος").fill("My Place Updated");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page).toHaveURL(/\/properties\/123$/);
  await expect(page.getByText("My Place Updated")).toBeVisible();

  // Create contract from property (AVAILABLE)
  await page.getByRole("button", { name: "Νέο Συμβόλαιο" }).click();
  await expect(page).toHaveURL(/\/contracts\/new\?propertyId=123$/);

  // Tenant select + rent
  await page.getByRole("combobox", { name: "Επιλογή ενοικιαστή" }).click();
  await page.getByRole("option", { name: /Tenant A/i }).click();
  await page.getByLabel("Μίσθωμα (€/μήνα)").fill("650");

  await page.getByRole("button", { name: "Δημιουργία" }).click();
  // UX: navigates back to property details when propertyId present
  await expect(page).toHaveURL(/\/properties\/123$/);
});

