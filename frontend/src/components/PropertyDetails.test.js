import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PropertyDetails from "./PropertyDetails";

jest.mock("../api", () => {
  const api = {
    get: jest.fn(),
  };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

test("AVAILABLE property enables 'Νέο Συμβόλαιο' and navigates", async () => {
  api.get.mockResolvedValueOnce({
    data: {
      id: 10,
      title: "P10",
      address: "Athens",
      type: "APARTMENT",
      size: 55,
      price: 650,
      status: "AVAILABLE",
    },
  });

  render(
    <MemoryRouter initialEntries={["/properties/10"]}>
      <Routes>
        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/contracts/new" element={<div>CONTRACT_NEW</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("P10")).toBeInTheDocument();
  const btn = screen.getByRole("button", { name: "Νέο Συμβόλαιο" });
  expect(btn).toBeEnabled();

  await userEvent.click(btn);
  expect(await screen.findByText("CONTRACT_NEW")).toBeInTheDocument();
});

test("RENTED property disables 'Νέο Συμβόλαιο' and shows info alert", async () => {
  api.get.mockResolvedValueOnce({
    data: {
      id: 10,
      title: "P10",
      address: "Athens",
      type: "APARTMENT",
      size: 55,
      price: 650,
      status: "RENTED",
    },
  });

  render(
    <MemoryRouter initialEntries={["/properties/10"]}>
      <Routes>
        <Route path="/properties/:id" element={<PropertyDetails />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("P10")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Νέο Συμβόλαιο" })).toBeDisabled();
  expect(
    screen.getByText(
      "Δεν μπορείς να δημιουργήσεις νέο συμβόλαιο όταν το ακίνητο δεν είναι διαθέσιμο."
    )
  ).toBeInTheDocument();
});

