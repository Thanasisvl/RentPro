import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RecommendationsPage from "./RecommendationsPage";
import PreferencesPage from "./PreferencesPage";

jest.mock("../api", () => {
  const api = {
    get: jest.fn(),
  };
  return { __esModule: true, default: api };
});

import api from "../api";

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test("shows AHP inconsistent screen on 422 AHP_INCONSISTENT", async () => {
  api.get.mockRejectedValueOnce({
    response: {
      status: 422,
      data: {
        detail: {
          error: "AHP_INCONSISTENT",
          message: "Inconsistent comparisons",
          cr: 0.2,
          threshold: 0.1,
        },
      },
    },
  });

  render(
    <MemoryRouter initialEntries={["/recommendations"]}>
      <Routes>
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(
    await screen.findByText("Αποτυχία ελέγχου συνέπειας AHP")
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Πήγαινε στις Προτιμήσεις" })
  ).toBeInTheDocument();
});

test("shows recommendations list on success", async () => {
  api.get.mockResolvedValueOnce({
    data: {
      meta: {
        criteria_order: ["price", "size", "property_type", "area_score"],
        is_benefit: [false, true, true, true],
        cr_threshold: 0.1,
        available_properties_total: 1,
        ranked_properties_count: 1,
        missing_area_score_count: 0,
      },
      items: [
        {
          score: 0.75,
          property: {
            id: 1,
            title: "Reco Apartment",
            address: "Athens",
            type: "APARTMENT",
            size: 55,
            price: 650,
            status: "AVAILABLE",
          },
          explain: {
            ahp: { cr: 0.01, weights: { price: 0.4, size: 0.3, property_type: 0.2, area_score: 0.1 } },
            topsis: { criteria_values: { price: 650, size: 55, property_type: 1, area_score: 7.5 } },
          },
        },
      ],
    },
  });

  render(
    <MemoryRouter initialEntries={["/recommendations"]}>
      <Routes>
        <Route path="/recommendations" element={<RecommendationsPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Προτάσεις")).toBeInTheDocument();
  expect(await screen.findByText("Reco Apartment")).toBeInTheDocument();
});

