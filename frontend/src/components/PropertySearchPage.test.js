import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PropertySearchPage from "./PropertySearchPage";
import PublicPropertyDetails from "./PublicPropertyDetails";

function mockResp(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
});

test("P0: /search loads and shows results", async () => {
  jest.spyOn(global, "fetch").mockImplementation((url) => {
    if (String(url).includes("/properties/search")) {
      return mockResp(200, {
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
      });
    }
    return mockResp(500, { detail: "Unexpected URL in test" });
  });

  render(
    <MemoryRouter initialEntries={["/search"]}>
      <Routes>
        <Route path="/search" element={<PropertySearchPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Test Apartment")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Αναζήτηση" })).toBeInTheDocument();
});

test("P0: /search shows empty state when no results", async () => {
  jest.spyOn(global, "fetch").mockImplementation((url) => {
    if (String(url).includes("/properties/search")) {
      return mockResp(200, {
        meta: { total: 0, count: 0, offset: 0, limit: 20 },
        items: [],
      });
    }
    return mockResp(500, { detail: "Unexpected URL in test" });
  });

  render(
    <MemoryRouter initialEntries={["/search"]}>
      <Routes>
        <Route path="/search" element={<PropertySearchPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Δεν βρέθηκαν αποτελέσματα")).toBeInTheDocument();
});

test("P0: clicking a search result navigates to public property details", async () => {
  jest.spyOn(global, "fetch").mockImplementation((url) => {
    const u = String(url);
    if (u.includes("/properties/search")) {
      return mockResp(200, {
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
      });
    }
    if (u.endsWith("/properties/1")) {
      return mockResp(200, {
        id: 1,
        title: "Test Apartment",
        address: "Athens",
        type: "APARTMENT",
        size: 55,
        price: 650,
        status: "AVAILABLE",
      });
    }
    return mockResp(500, { detail: "Unexpected URL in test" });
  });

  render(
    <MemoryRouter initialEntries={["/search"]}>
      <Routes>
        <Route path="/search" element={<PropertySearchPage />} />
        <Route path="/search/properties/:id" element={<PublicPropertyDetails />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Test Apartment")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("link", { name: "Προβολή" }));

  // Details page header + title
  expect(await screen.findByText("Λεπτομέρειες Ακινήτου")).toBeInTheDocument();
  expect(await screen.findByText("Test Apartment")).toBeInTheDocument();
});

