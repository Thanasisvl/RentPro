import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PropertyForm from "./PropertyForm";

jest.mock("../api", () => {
  const api = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

async function selectMuiOption(labelText, optionText) {
  const combo = screen.getByRole("combobox", { name: labelText });
  fireEvent.mouseDown(combo);
  await userEvent.click(await screen.findByRole("option", { name: optionText }));
}

test("create property submits and navigates to details", async () => {
  api.post.mockResolvedValueOnce({ data: { id: 123 } });

  render(
    <MemoryRouter initialEntries={["/properties/new"]}>
      <Routes>
        <Route path="/properties/new" element={<PropertyForm mode="create" />} />
        <Route path="/properties/:id" element={<div>DETAILS</div>} />
      </Routes>
    </MemoryRouter>
  );

  const saveBtn = screen.getByRole("button", { name: "Αποθήκευση" });
  expect(saveBtn).toBeDisabled();

  await userEvent.type(screen.getByLabelText(/Τίτλος/i), "My place");
  await userEvent.type(screen.getByLabelText(/Διεύθυνση/i), "Athens");
  await selectMuiOption(/Τύπος ακινήτου/i, "Διαμέρισμα");
  await userEvent.clear(screen.getByLabelText(/Εμβαδόν \(τ\.μ\.\)/i));
  await userEvent.type(screen.getByLabelText(/Εμβαδόν \(τ\.μ\.\)/i), "55");
  await userEvent.clear(screen.getByLabelText(/Τιμή \(€\/μήνα\)/i));
  await userEvent.type(screen.getByLabelText(/Τιμή \(€\/μήνα\)/i), "650");

  expect(saveBtn).toBeEnabled();
  await userEvent.click(saveBtn);

  expect(api.post).toHaveBeenCalledWith("/properties/", {
    title: "My place",
    description: "",
    address: "Athens",
    type: "APARTMENT",
    size: 55,
    price: 650,
    status: "AVAILABLE",
  });

  expect(await screen.findByText("DETAILS")).toBeInTheDocument();
});

test("edit property loads, submits PUT and navigates to details", async () => {
  api.get.mockResolvedValueOnce({
    data: {
      id: 123,
      title: "Old title",
      description: "d",
      address: "Addr",
      type: "APARTMENT",
      size: 50,
      price: 600,
      status: "AVAILABLE",
    },
  });
  api.put.mockResolvedValueOnce({});

  render(
    <MemoryRouter initialEntries={["/properties/123/edit"]}>
      <Routes>
        <Route path="/properties/:id/edit" element={<PropertyForm mode="edit" />} />
        <Route path="/properties/:id" element={<div>DETAILS</div>} />
      </Routes>
    </MemoryRouter>
  );

  // Wait for form to prefill
  expect(await screen.findByDisplayValue("Old title")).toBeInTheDocument();

  await userEvent.clear(screen.getByLabelText(/Τίτλος/i));
  await userEvent.type(screen.getByLabelText(/Τίτλος/i), "New title");

  await userEvent.click(screen.getByRole("button", { name: "Αποθήκευση" }));

  expect(api.put).toHaveBeenCalledWith("/properties/123", expect.any(Object));
  expect(await screen.findByText("DETAILS")).toBeInTheDocument();
});

