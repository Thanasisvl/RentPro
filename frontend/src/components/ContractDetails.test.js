import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ContractDetails from "./ContractDetails";

jest.mock("../api", () => {
  const api = { get: jest.fn() };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

test("loads contract details and enables PDF when present", async () => {
  api.get.mockImplementation((url) => {
    if (url === "/contracts/1") {
      return Promise.resolve({
        data: {
          id: 1,
          status: "ACTIVE",
          property_id: 10,
          tenant_id: 20,
          start_date: "2026-01-01",
          end_date: "2027-01-01",
          rent_amount: 650,
          pdf_url: "/uploads/x.pdf",
        },
      });
    }
    if (url === "/properties/10") {
      return Promise.resolve({
        data: { id: 10, address: "Athens Address", status: "RENTED" },
      });
    }
    if (url === "/tenants/20") {
      return Promise.resolve({ data: { id: 20, name: "Tenant A" } });
    }
    if (url === "/contracts/1/pdf") {
      return Promise.resolve({ data: new Blob(["pdf"], { type: "application/pdf" }) });
    }
    return Promise.reject(new Error("unexpected url " + url));
  });

  const originalCreate = window.URL.createObjectURL;
  const originalRevoke = window.URL.revokeObjectURL;
  window.URL.createObjectURL = jest.fn(() => "blob:mock");
  window.URL.revokeObjectURL = jest.fn(() => {});
  const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);

  render(
    <MemoryRouter initialEntries={["/contracts/1"]}>
      <Routes>
        <Route path="/contracts/:id" element={<ContractDetails />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Συμβόλαιο #1")).toBeInTheDocument();
  expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  expect(screen.getByText("Athens Address")).toBeInTheDocument();
  expect(screen.getByText("Tenant A")).toBeInTheDocument();
  expect(screen.getByText("Μη διαθέσιμο")).toBeInTheDocument();
  expect(screen.getByText("(RENTED)")).toBeInTheDocument();

  const pdfBtn = screen.getByRole("button", { name: "Προβολή PDF" });
  expect(pdfBtn).toBeEnabled();

  await userEvent.click(pdfBtn);

  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith("/contracts/1/pdf", { responseType: "blob" })
  );
  expect(window.URL.createObjectURL).toHaveBeenCalled();
  expect(openSpy).toHaveBeenCalledWith("blob:mock", "_blank", "noopener,noreferrer");

  window.URL.createObjectURL = originalCreate;
  window.URL.revokeObjectURL = originalRevoke;
  openSpy.mockRestore();
});

