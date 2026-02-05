import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./LoginForm";

jest.mock("../api", () => ({
  login: jest.fn(),
}));

import { login } from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

test("successful login navigates to /app", async () => {
  login.mockResolvedValueOnce({ access_token: "x", token_type: "bearer" });

  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/app" element={<div>APP</div>} />
      </Routes>
    </MemoryRouter>
  );

  await userEvent.type(screen.getByLabelText(/Όνομα χρήστη/i), "demo");
  await userEvent.type(screen.getByLabelText(/Κωδικός/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: "Σύνδεση" }));

  expect(await screen.findByText("APP")).toBeInTheDocument();
  expect(login).toHaveBeenCalledWith("demo", "secret");
});

test("failed login shows error message from API", async () => {
  login.mockRejectedValueOnce({
    response: { data: { detail: "Invalid credentials" } },
  });

  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
      </Routes>
    </MemoryRouter>
  );

  await userEvent.type(screen.getByLabelText(/Όνομα χρήστη/i), "demo");
  await userEvent.type(screen.getByLabelText(/Κωδικός/i), "wrong");
  await userEvent.click(screen.getByRole("button", { name: "Σύνδεση" }));

  expect(
    await screen.findByText("Αποτυχία σύνδεσης: Invalid credentials")
  ).toBeInTheDocument();
});

