import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ForbiddenPage from "./components/ForbiddenPage";
import { RoleHomeRedirect, RequireRole } from "./App";

function b64url(jsonObj) {
  const raw = btoa(JSON.stringify(jsonObj));
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makeJwt(payload) {
  // The app only decodes payload; signature is irrelevant for UI routing.
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.sig`;
}

beforeEach(() => {
  localStorage.clear();
});

test("/app redirects to /app/tenant for TENANT role", async () => {
  localStorage.setItem("token", makeJwt({ role: "TENANT", username: "tenant1" }));

  render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/app" element={<RoleHomeRedirect />} />
        <Route path="/app/tenant" element={<div>TENANT_HOME</div>} />
        <Route path="/app/owner" element={<div>OWNER_HOME</div>} />
        <Route path="/app/admin" element={<div>ADMIN_HOME</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("TENANT_HOME")).toBeInTheDocument();
});

test("/app redirects to /app/owner for OWNER role", async () => {
  localStorage.setItem("token", makeJwt({ role: "OWNER", username: "owner1" }));

  render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/app" element={<RoleHomeRedirect />} />
        <Route path="/app/tenant" element={<div>TENANT_HOME</div>} />
        <Route path="/app/owner" element={<div>OWNER_HOME</div>} />
        <Route path="/app/admin" element={<div>ADMIN_HOME</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("OWNER_HOME")).toBeInTheDocument();
});

test("/app redirects to /app/admin for ADMIN role", async () => {
  localStorage.setItem("token", makeJwt({ role: "ADMIN", username: "admin1" }));

  render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/app" element={<RoleHomeRedirect />} />
        <Route path="/app/tenant" element={<div>TENANT_HOME</div>} />
        <Route path="/app/owner" element={<div>OWNER_HOME</div>} />
        <Route path="/app/admin" element={<div>ADMIN_HOME</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("ADMIN_HOME")).toBeInTheDocument();
});

test("RequireRole redirects to /forbidden when role not allowed", async () => {
  localStorage.setItem("token", makeJwt({ role: "TENANT", username: "tenant1" }));
  // RequireRole stores attemptedPath from window.location, so set it explicitly.
  window.history.pushState({}, "", "/owner-only");

  render(
    <MemoryRouter initialEntries={["/owner-only"]}>
      <Routes>
        <Route
          path="/owner-only"
          element={
            <RequireRole allowed={["OWNER", "ADMIN"]}>
              <div>SHOULD_NOT_RENDER</div>
            </RequireRole>
          }
        />
        <Route path="/forbidden" element={<ForbiddenPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("Μη εξουσιοδοτημένη πρόσβαση")).toBeInTheDocument();
  expect(screen.queryByText("SHOULD_NOT_RENDER")).not.toBeInTheDocument();
});

