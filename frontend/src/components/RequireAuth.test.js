import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "./RequireAuth";

beforeEach(() => {
  localStorage.clear();
});

test("redirects to /login when unauthenticated", () => {
  render(
    <MemoryRouter initialEntries={["/properties"]}>
      <Routes>
        <Route
          path="/properties"
          element={
            <RequireAuth>
              <div>PROTECTED</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText("LOGIN")).toBeInTheDocument();
});

test("renders children when authenticated", () => {
  localStorage.setItem("token", "fake-token");

  render(
    <MemoryRouter initialEntries={["/properties"]}>
      <Routes>
        <Route
          path="/properties"
          element={
            <RequireAuth>
              <div>PROTECTED</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText("PROTECTED")).toBeInTheDocument();
});

