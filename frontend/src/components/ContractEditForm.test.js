import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ContractEditForm from "./ContractEditForm";

jest.mock("../api", () => {
  const api = { get: jest.fn(), put: jest.fn() };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

async function selectMuiOption(labelText, optionText) {
  const combo = await screen.findByRole("combobox", { name: labelText });
  fireEvent.mouseDown(combo);
  await userEvent.click(await screen.findByRole("option", { name: optionText }));
}

test("loads contract + tenants, submits update and navigates back to /contracts", async () => {
  api.get.mockImplementation((url) => {
    if (url === "/contracts/1") {
      return Promise.resolve({
        data: {
          id: 1,
          property_id: 10,
          tenant_id: 20,
          status: "ACTIVE",
          start_date: "2026-01-01",
          end_date: "2027-01-01",
          rent_amount: 650,
        },
      });
    }
    if (url === "/tenants/") {
      return Promise.resolve({
        data: [
          { id: 20, name: "Tenant A", afm: "123" },
          { id: 21, name: "Tenant B", afm: "456" },
        ],
      });
    }
    return Promise.reject(new Error("unexpected url " + url));
  });
  api.put.mockResolvedValueOnce({});

  render(
    <MemoryRouter initialEntries={["/contracts/1/edit"]}>
      <Routes>
        <Route path="/contracts/:id/edit" element={<ContractEditForm />} />
        <Route path="/contracts" element={<div>CONTRACTS_LIST</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Επεξεργασία Συμβολαίου #1")).toBeInTheDocument();
  expect(await screen.findByDisplayValue("10")).toBeInTheDocument(); // property id (disabled)

  await selectMuiOption("Ενοικιαστής", /Tenant B/i);

  await userEvent.clear(screen.getByLabelText(/Μίσθωμα \(€\/μήνα\)/i));
  await userEvent.type(screen.getByLabelText(/Μίσθωμα \(€\/μήνα\)/i), "700");

  await userEvent.click(screen.getByRole("button", { name: "Αποθήκευση" }));

  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith("/contracts/1", {
      tenant_id: 21,
      start_date: "2026-01-01",
      end_date: "2027-01-01",
      rent_amount: 700,
    })
  );

  expect(await screen.findByText("CONTRACTS_LIST")).toBeInTheDocument();
});

