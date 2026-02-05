import React from "react";
import { render, screen, within, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PropertyList from "./PropertyList";

jest.mock("../api", () => {
  const api = {
    get: jest.fn(),
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

test("loads properties and shows row actions", async () => {
  getUserRole.mockReturnValue("OWNER");
  api.get.mockResolvedValueOnce({
    data: [
      { id: 1, title: "P1", address: "Athens", status: "AVAILABLE" },
    ],
  });

  render(
    <MemoryRouter>
      <PropertyList />
    </MemoryRouter>
  );

  expect(await screen.findByText("P1")).toBeInTheDocument();

  // action buttons exist (aria-labels)
  expect(screen.getByLabelText("Προβολή ακινήτου")).toBeInTheDocument();
  expect(screen.getByLabelText("Επεξεργασία ακινήτου")).toBeInTheDocument();
  expect(screen.getByLabelText("Διαγραφή ακινήτου")).toBeInTheDocument();
});

test("admin can filter by owner_id (calls API with params)", async () => {
  getUserRole.mockReturnValue("ADMIN");
  api.get
    .mockResolvedValueOnce({ data: [] }) // initial load
    .mockResolvedValueOnce({ data: [] }); // after clicking search

  render(
    <MemoryRouter>
      <PropertyList />
    </MemoryRouter>
  );

  // Wait for initial load to complete (dialog not needed)
  await screen.findByText("Ιδιοκτησίες");

  await userEvent.type(screen.getByLabelText("Owner ID (admin)"), "42");
  await userEvent.click(screen.getByRole("button", { name: "Αναζήτηση" }));

  expect(api.get).toHaveBeenLastCalledWith("/properties/", {
    params: { owner_id: 42 },
  });
});

test("delete property success removes it from list", async () => {
  getUserRole.mockReturnValue("OWNER");
  api.get.mockResolvedValueOnce({
    data: [{ id: 1, title: "P1", address: "Athens", status: "AVAILABLE" }],
  });
  api.delete.mockResolvedValueOnce({});

  render(
    <MemoryRouter>
      <PropertyList />
    </MemoryRouter>
  );

  expect(await screen.findByText("P1")).toBeInTheDocument();

  await userEvent.click(screen.getByLabelText("Διαγραφή ακινήτου"));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Επιβεβαίωση διαγραφής")).toBeInTheDocument();

  await userEvent.click(within(dialog).getByRole("button", { name: "Επιβεβαίωση" }));

  expect(api.delete).toHaveBeenCalledWith("/properties/1");
  await waitForElementToBeRemoved(() => screen.queryByText("P1"));
});

test("delete property 409 shows active-contract message", async () => {
  getUserRole.mockReturnValue("OWNER");
  api.get.mockResolvedValueOnce({
    data: [{ id: 1, title: "P1", address: "Athens", status: "AVAILABLE" }],
  });
  api.delete.mockRejectedValueOnce({ response: { status: 409 } });

  render(
    <MemoryRouter>
      <PropertyList />
    </MemoryRouter>
  );

  expect(await screen.findByText("P1")).toBeInTheDocument();
  await userEvent.click(screen.getByLabelText("Διαγραφή ακινήτου"));

  const dialog = screen.getByRole("dialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "Επιβεβαίωση" }));

  expect(
    await within(dialog).findByText(
      "Δεν μπορείς να διαγράψεις ακίνητο που έχει ενεργό συμβόλαιο."
    )
  ).toBeInTheDocument();
});

