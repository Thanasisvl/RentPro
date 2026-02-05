import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PreferencesPage from "./PreferencesPage";

jest.mock("../api", () => {
  const api = {
    put: jest.fn(),
    post: jest.fn(),
  };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

test("submitting preferences calls API and navigates to /recommendations", async () => {
  api.put.mockResolvedValueOnce({});
  api.post.mockResolvedValueOnce({});

  render(
    <MemoryRouter initialEntries={["/preferences"]}>
      <Routes>
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/recommendations" element={<div>RECOMMENDATIONS</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Προτιμήσεις")).toBeInTheDocument();

  const submit = screen.getByRole("button", { name: "Υποβολή προτιμήσεων" });
  expect(submit).toBeEnabled();

  await userEvent.click(submit);

  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith("/preference-profiles/me", {
      name: "UC-04 Profile",
    })
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/preference-profiles/me/pairwise-comparisons",
      expect.objectContaining({
        comparisons: expect.any(Array),
      })
    )
  );

  expect(await screen.findByText("RECOMMENDATIONS")).toBeInTheDocument();
});

