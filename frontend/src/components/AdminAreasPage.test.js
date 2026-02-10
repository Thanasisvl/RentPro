import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminAreasPage from "./AdminAreasPage";

jest.mock("../api", () => {
  const api = { get: jest.fn(), put: jest.fn(), post: jest.fn() };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

test("loads areas and shows table", async () => {
  api.get.mockResolvedValueOnce({
    data: [
      { id: 10, code: "MAROUSI", name: "Μαρούσι", area_score: 7.5, is_active: true },
      { id: 11, code: "ATHENS", name: "Αθήνα", area_score: 7.2, is_active: true },
    ],
  });

  render(
    <MemoryRouter>
      <AdminAreasPage />
    </MemoryRouter>
  );

  expect(await screen.findByText("Περιοχές (Areas)")).toBeInTheDocument();
  expect(screen.getByText("Σύνολο: 2")).toBeInTheDocument();
  expect(screen.getByText("MAROUSI")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/areas/admin");
});

test("save calls PUT /areas/:id", async () => {
  api.get.mockResolvedValueOnce({
    data: [{ id: 10, code: "MAROUSI", name: "Μαρούσι", area_score: 7.5, is_active: true }],
  });
  api.put.mockResolvedValueOnce({
    data: { id: 10, code: "MAROUSI", name: "Μαρούσι", area_score: 8.0, is_active: true },
  });

  render(
    <MemoryRouter>
      <AdminAreasPage />
    </MemoryRouter>
  );

  expect(await screen.findByText("MAROUSI")).toBeInTheDocument();

  const scoreInputs = screen.getAllByRole("spinbutton");
  // 0: "Νέα περιοχή" form, 1: first table row
  const score = scoreInputs[1];
  await userEvent.clear(score);
  await userEvent.type(score, "8");

  await userEvent.click(screen.getByRole("button", { name: "Αποθήκευση" }));

  expect(api.put).toHaveBeenCalledWith("/areas/10", expect.objectContaining({ area_score: 8 }));
});

