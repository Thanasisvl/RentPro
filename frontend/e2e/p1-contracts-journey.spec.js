const { test, expect } = require("@playwright/test");
const { setAuthToken } = require("./utils");

test("@p1 OWNER: contracts list filters + PDF + terminate + delete flows", async ({ page }) => {
  // Auth as OWNER
  await setAuthToken(page, { role: "OWNER", username: "owner1" });

  // Make PDF open deterministic (avoid popup blockers / new tabs)
  await page.addInitScript(() => {
    // capture last open() call
    window.__lastOpenArgs = null;
    window.open = (...args) => {
      window.__lastOpenArgs = args;
      return null;
    };
    // stable blob URL
    if (window.URL && typeof window.URL.createObjectURL === "function") {
      window.URL.createObjectURL = () => "blob:mock";
    }
  });

  let contractStatus = "ACTIVE";

  const contract = () => ({
    id: 1,
    property_id: 10,
    tenant_id: 20,
    status: contractStatus,
    start_date: "2026-01-01",
    end_date: "2027-01-01",
    rent_amount: 650,
  });

  // Lookups used by contracts table (to show address + tenant name)
  await page.route("**/properties/**", async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 405, body: "Method not allowed" });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 10, address: "Athens Address" }]),
    });
  });

  await page.route("**/tenants/**", async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 405, body: "Method not allowed" });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 20, name: "Tenant A", afm: "123456789" }]),
    });
  });

  // Contracts list (GET /contracts/?...)
  await page.route("**/contracts/?*", async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 405, body: "Method not allowed" });

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([contract()]),
    });
  });

  // Terminate endpoint
  await page.route("**/contracts/1/terminate", async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fulfill({ status: 405, body: "Method not allowed" });
    contractStatus = "TERMINATED";
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // Delete endpoint
  await page.route("**/contracts/1", async (route) => {
    const req = route.request();
    if (req.method() !== "DELETE") return route.fulfill({ status: 405, body: "Method not allowed" });

    if (contractStatus === "ACTIVE") {
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Active contract cannot be deleted" }),
      });
    }
    // allow delete for non-ACTIVE
    contractStatus = "DELETED";
    return route.fulfill({ status: 204, body: "" });
  });

  // PDF endpoint
  await page.route("**/contracts/1/pdf", async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 405, body: "Method not allowed" });
    return route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "%PDF-1.4 mock",
    });
  });

  // After delete, the UI reloads list. Return empty list when deleted.
  await page.route("**/contracts/", async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 405, body: "Method not allowed" });
    const items = contractStatus === "DELETED" ? [] : [contract()];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(items),
    });
  });

  // --- Journey ---
  await page.goto("/contracts");
  await expect(page.getByRole("heading", { name: "Συμβόλαια" })).toBeVisible();
  await expect(page.getByText("ACTIVE")).toBeVisible();

  // Filters: set status and click search (assert request carries query param)
  let lastContractsUrl = null;
  await page.route("**/contracts/?*", async (route) => {
    lastContractsUrl = route.request().url();
    const items = contractStatus === "DELETED" ? [] : [contract()];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(items),
    });
  });

  await page.getByRole("combobox", { name: "Κατάσταση" }).click();
  await page.getByRole("option", { name: "ACTIVE" }).click();
  await page.getByRole("button", { name: "Αναζήτηση" }).click();
  await expect.poll(() => lastContractsUrl).not.toBeNull();
  expect(String(lastContractsUrl)).toContain("status=ACTIVE");

  // PDF open
  await page.getByRole("button", { name: "PDF" }).click();
  const openArgs = await page.evaluate(() => window.__lastOpenArgs);
  expect(openArgs).toBeTruthy();
  expect(openArgs[0]).toBe("blob:mock");

  // Delete ACTIVE -> 409 message
  await page.getByRole("button", { name: "Διαγραφή" }).click();
  await page.getByRole("button", { name: "Επιβεβαίωση" }).click();
  await expect(
    page.getByText("Δεν μπορείς να διαγράψεις ACTIVE συμβόλαιο (κάνε τερματισμό).")
  ).toBeVisible();

  // Terminate -> status updates to TERMINATED (reload)
  await page.getByRole("button", { name: "Τερματισμός" }).click();
  await page.getByRole("button", { name: "Επιβεβαίωση" }).click();
  await expect(page.getByText("TERMINATED")).toBeVisible();

  // Now delete should succeed and list becomes empty
  await page.getByRole("button", { name: "Διαγραφή" }).click();
  await page.getByRole("button", { name: "Επιβεβαίωση" }).click();
  await expect(page.getByText("Δεν υπάρχουν συμβόλαια.")).toBeVisible();
});

