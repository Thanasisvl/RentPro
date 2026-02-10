import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ContractList from "./ContractList";

jest.mock("../api", () => {
  const api = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };
  return {
    __esModule: true,
    default: api,
    getUserRole: jest.fn(),
  };
});

import api, { getUserRole } from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

function mockContracts() {
  return [
    {
      id: 1,
      property_id: 10,
      tenant_id: 20,
      status: "ACTIVE",
      start_date: "2026-01-01",
      end_date: "2027-01-01",
      rent_amount: 650,
    },
  ];
}

test("terminate contract flow calls API and reloads list", async () => {
  getUserRole.mockReturnValue("OWNER");
  api.get
    // initial load: contracts + properties + tenants
    .mockResolvedValueOnce({ data: mockContracts() })
    .mockResolvedValueOnce({ data: [{ id: 10, address: "Athens Address" }] })
    .mockResolvedValueOnce({ data: [{ id: 20, name: "Tenant A" }] })
    // reload after terminate: contracts + properties + tenants
    .mockResolvedValueOnce({ data: mockContracts() })
    .mockResolvedValueOnce({ data: [{ id: 10, address: "Athens Address" }] })
    .mockResolvedValueOnce({ data: [{ id: 20, name: "Tenant A" }] });
  api.post.mockResolvedValueOnce({});

  render(
    <MemoryRouter>
      <ContractList />
    </MemoryRouter>
  );

  expect(await screen.findByText("Συμβόλαια")).toBeInTheDocument();
  expect(await screen.findByText("ACTIVE")).toBeInTheDocument();
  expect(await screen.findByText("Athens Address")).toBeInTheDocument();
  expect(await screen.findByText("Tenant A")).toBeInTheDocument();
  // Derived indicator column: ACTIVE -> "Ενεργό"
  const row = screen.getByText("ACTIVE").closest("tr");
  expect(within(row).getByText("Ενεργό")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Τερματισμός" }));
  await userEvent.click(screen.getByRole("button", { name: "Επιβεβαίωση" }));

  expect(api.post).toHaveBeenCalledWith("/contracts/1/terminate");
  expect(api.get).toHaveBeenCalledWith("/contracts/", { params: {} });
});

test("delete 409 shows active-contract deletion message", async () => {
  getUserRole.mockReturnValue("OWNER");
  api.get
    .mockResolvedValueOnce({ data: mockContracts() }) // contracts
    .mockResolvedValueOnce({ data: [{ id: 10, address: "Athens Address" }] }) // properties
    .mockResolvedValueOnce({ data: [{ id: 20, name: "Tenant A" }] }); // tenants
  api.delete.mockRejectedValueOnce({ response: { status: 409 } });

  render(
    <MemoryRouter>
      <ContractList />
    </MemoryRouter>
  );

  expect(await screen.findByText("ACTIVE")).toBeInTheDocument();
  expect(await screen.findByText("Athens Address")).toBeInTheDocument();
  expect(await screen.findByText("Tenant A")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Διαγραφή" }));
  await userEvent.click(screen.getByRole("button", { name: "Επιβεβαίωση" }));

  expect(
    await screen.findByText(
      "Δεν μπορείς να διαγράψεις ACTIVE συμβόλαιο (κάνε τερματισμό)."
    )
  ).toBeInTheDocument();
});

test("PDF button opens a new window with blob URL", async () => {
  getUserRole.mockReturnValue("OWNER");
  api.get
    // initial load: contracts + properties + tenants
    .mockResolvedValueOnce({ data: mockContracts() })
    .mockResolvedValueOnce({ data: [{ id: 10, address: "Athens Address" }] })
    .mockResolvedValueOnce({ data: [{ id: 20, name: "Tenant A" }] })
    .mockResolvedValueOnce({ data: new Blob(["pdf"], { type: "application/pdf" }) }); // pdf fetch

  const originalCreate = window.URL.createObjectURL;
  const originalRevoke = window.URL.revokeObjectURL;
  window.URL.createObjectURL = jest.fn(() => "blob:mock");
  window.URL.revokeObjectURL = jest.fn(() => {});
  const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);

  render(
    <MemoryRouter>
      <ContractList />
    </MemoryRouter>
  );

  expect(await screen.findByText("ACTIVE")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "PDF" }));

  expect(api.get).toHaveBeenLastCalledWith("/contracts/1/pdf", {
    responseType: "blob",
  });
  await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  expect(openSpy).toHaveBeenCalledWith(
    "blob:mock",
    "_blank",
    "noopener,noreferrer"
  );

  window.URL.createObjectURL = originalCreate;
  window.URL.revokeObjectURL = originalRevoke;
  openSpy.mockRestore();
});

