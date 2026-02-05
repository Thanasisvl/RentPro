import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminUsersPage from "./AdminUsersPage";

jest.mock("../api", () => {
  const api = { get: jest.fn() };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

test("loads users and shows table + total from X-Total-Count", async () => {
  api.get.mockResolvedValueOnce({
    data: [
      {
        id: 1,
        username: "admin",
        full_name: "Admin User",
        email: "admin@example.com",
        role: "ADMIN",
      },
    ],
    headers: { "x-total-count": "1" },
  });

  render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>
  );

  expect(await screen.findByText("Χρήστες")).toBeInTheDocument();
  expect(screen.getByText("Σύνολο: 1")).toBeInTheDocument();
  expect(screen.getByText("admin")).toBeInTheDocument();
  expect(screen.getByText("Διαχειριστής")).toBeInTheDocument();
});

test("search sends q param and reloads", async () => {
  api.get
    .mockResolvedValueOnce({ data: [], headers: {} }) // initial load
    .mockResolvedValueOnce({ data: [], headers: {} }); // reload after q change

  render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>
  );

  expect(await screen.findByText("Χρήστες")).toBeInTheDocument();

  // This page auto-reloads when q changes (effect depends on q).
  fireEvent.change(screen.getByLabelText("Αναζήτηση (username/email/όνομα)"), {
    target: { value: "john" },
  });

  await waitFor(() =>
    expect(api.get).toHaveBeenLastCalledWith("/users/", {
      params: expect.objectContaining({ q: "john" }),
    })
  );
});

test("403 shows forbidden error message", async () => {
  api.get.mockRejectedValueOnce({ response: { status: 403 } });

  render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>
  );

  expect(await screen.findByText("Χρήστες")).toBeInTheDocument();
  expect(
    await screen.findByText("Δεν έχεις δικαίωμα πρόσβασης στους χρήστες.")
  ).toBeInTheDocument();
});

