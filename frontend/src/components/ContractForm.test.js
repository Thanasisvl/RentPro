import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ContractForm from "./ContractForm";

jest.mock("../api", () => {
  const api = {
    get: jest.fn(),
    post: jest.fn(),
  };
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

test("creates contract with PDF upload and navigates back to property details when propertyId is provided", async () => {
  // tenants + property load
  api.get.mockImplementation((url) => {
    if (url === "/tenants") {
      return Promise.resolve({
        data: [{ id: 20, name: "Tenant A", afm: "123" }],
      });
    }
    if (url === "/properties/12") {
      return Promise.resolve({
        data: { id: 12, title: "P12", status: "AVAILABLE" },
      });
    }
    return Promise.reject(new Error("unexpected url: " + url));
  });

  api.post
    .mockResolvedValueOnce({ data: { id: 5 } }) // create contract
    .mockResolvedValueOnce({}); // upload

  const file = new File(["pdf"], "contract.pdf", { type: "application/pdf" });

  render(
    <MemoryRouter initialEntries={["/contracts/new?propertyId=12"]}>
      <Routes>
        <Route path="/contracts/new" element={<ContractForm />} />
        <Route path="/properties/:id" element={<div>PROPERTY_DETAILS</div>} />
      </Routes>
    </MemoryRouter>
  );

  // PropertyId should be prefilled and disabled
  const propertyId = await screen.findByLabelText(/Κωδικός ακινήτου \(Property ID\)/i);
  expect(propertyId).toBeDisabled();

  // Wait tenants to load and select
  await selectMuiOption(/Επιλογή ενοικιαστή/i, /Tenant A/i);

  await userEvent.type(screen.getByLabelText(/Μίσθωμα \(€\/μήνα\)/i), "650");

  // Upload PDF (no explicit label; query by input type)
  const fileInput = document.querySelector('input[type="file"]');
  expect(fileInput).toBeTruthy();
  fireEvent.change(fileInput, { target: { files: [file] } });

  await userEvent.click(screen.getByRole("button", { name: "Δημιουργία" }));

  expect(api.post).toHaveBeenNthCalledWith(1, "/contracts/", expect.any(Object));
  await waitFor(() =>
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      "/contracts/5/upload",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } }
    )
  );

  expect(await screen.findByText("PROPERTY_DETAILS")).toBeInTheDocument();
});

