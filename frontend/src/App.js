import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Stack,
} from "@mui/material";

import LandingPage from "./components/LandingPage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import LogoutButton from "./components/LogoutButton";
import RequireAuth from "./components/RequireAuth";
import { getAccessToken, getUserRole } from "./api";

import PreferencesPage from "./components/PreferencesPage";
import RecommendationsPage from "./components/RecommendationsPage";
import PropertySearchPage from "./components/PropertySearchPage";
import PublicPropertyDetails from "./components/PublicPropertyDetails";
import PropertyList from "./components/PropertyList";
import PropertyDetails from "./components/PropertyDetails";
import PropertyForm from "./components/PropertyForm";
import TenantList from "./components/TenantList";
import TenantForm from "./components/TenantForm";
import ContractForm from "./components/ContractForm";
import ContractEditForm from "./components/ContractEditForm";
import ContractList from "./components/ContractList";
import ContractDetails from "./components/ContractDetails";
import ProfilePage from "./components/ProfilePage";
import TenantDashboard from "./components/dashboards/TenantDashboard";
import OwnerDashboard from "./components/dashboards/OwnerDashboard";
import AdminDashboard from "./components/dashboards/AdminDashboard";
import AdminUsersPage from "./components/AdminUsersPage";
import ForbiddenPage from "./components/ForbiddenPage";

// Logo asset
import logo from "./assets/rentpro_logo_mark.png";

function normalizeRole(raw) {
  const r = String(raw || "").toUpperCase().trim();
  if (r === "ADMIN") return "ADMIN";
  if (r === "OWNER") return "OWNER";
  return "TENANT";
}

function roleLabel(role) {
  if (role === "ADMIN") return "Διαχειριστής";
  if (role === "OWNER") return "Ιδιοκτήτης";
  return "Ενοικιαστής";
}

function RoleHomeRedirect() {
  const role = normalizeRole(getUserRole());
  if (role === "OWNER") return <Navigate to="/app/owner" replace />;
  if (role === "ADMIN") return <Navigate to="/app/admin" replace />;
  return <Navigate to="/app/tenant" replace />;
}

function RequireRole({ allowed, children }) {
  const role = normalizeRole(getUserRole());
  const ok = Array.isArray(allowed) && allowed.includes(role);
  if (!ok) {
    // UC-06 A1: show an explicit authorization error screen
    const attemptedPath = window?.location?.pathname || "";
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{
          attemptedPath,
          currentRole: role,
          requiredRoles: allowed,
        }}
      />
    );
  }
  return children;
}

// NEW: shared styles for active nav
const navBtnSx = {
  textTransform: "none",
  borderRadius: 999,
  px: 1.5,
  py: 0.75,
  color: "text.primary",
  "&.active": {
    bgcolor: "action.selected",
    fontWeight: 800,
  },
};

function App() {
  const isAuthenticated = !!getAccessToken();
  const role = normalizeRole(getUserRole());

  const homeTo = isAuthenticated ? "/app" : "/";
  const homeLabel = isAuthenticated ? `Πίνακας · ${roleLabel(role)}` : "Αρχική";

  return (
    <Router>
      <AppBar
        position="sticky"
        elevation={0}
        color="default"
        sx={{
          top: 0,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(10px)",
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Brand / logo (left) */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            component={NavLink}
            to={homeTo}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Box
              component="img"
              src={logo}
              alt="RentPro"
              sx={{ width: 40, height: 40, objectFit: "contain" }}
            />
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
              RentPro
            </Typography>
          </Stack>

          {/* Nav (center) */}
          <Stack direction="row" spacing={0.5} sx={{ flex: 1, overflowX: "auto" }}>
            <Button
              component={NavLink}
              to={homeTo}
              end
              className={({ isActive }) => (isActive ? "active" : "")}
              sx={navBtnSx}
            >
              {homeLabel}
            </Button>

            {isAuthenticated ? (
              role === "TENANT" ? (
                <>
                  <Button
                    component={NavLink}
                    to="/search"
                    className={({ isActive }) => (isActive ? "active" : "")}
                    sx={navBtnSx}
                  >
                    Αναζήτηση
                  </Button>
                  <Button
                    component={NavLink}
                    to="/preferences"
                    className={({ isActive }) => (isActive ? "active" : "")}
                    sx={navBtnSx}
                  >
                    Προτιμήσεις
                  </Button>
                  <Button
                    component={NavLink}
                    to="/recommendations"
                    className={({ isActive }) => (isActive ? "active" : "")}
                    sx={navBtnSx}
                  >
                    Προτάσεις
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    component={NavLink}
                    to="/properties"
                    className={({ isActive }) => (isActive ? "active" : "")}
                    sx={navBtnSx}
                  >
                    Ακίνητα
                  </Button>
                  <Button
                    component={NavLink}
                    to="/tenants"
                    className={({ isActive }) => (isActive ? "active" : "")}
                    sx={navBtnSx}
                  >
                    Ενοικιαστές
                  </Button>
                  <Button
                    component={NavLink}
                    to="/contracts"
                    className={({ isActive }) => (isActive ? "active" : "")}
                    sx={navBtnSx}
                  >
                    Συμβόλαια
                  </Button>
                  {role === "ADMIN" ? (
                    <Button
                      component={NavLink}
                      to="/app/admin"
                      className={({ isActive }) => (isActive ? "active" : "")}
                      sx={navBtnSx}
                    >
                      Διαχείριση
                    </Button>
                  ) : null}
                </>
              )
            ) : (
              <>
                <Button
                  component={NavLink}
                  to="/search"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  sx={navBtnSx}
                >
                  Αναζήτηση
                </Button>
                <Button
                  component={NavLink}
                  to="/login"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  sx={navBtnSx}
                >
                  Σύνδεση
                </Button>
                <Button
                  component={NavLink}
                  to="/register"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  sx={navBtnSx}
                >
                  Εγγραφή
                </Button>
              </>
            )}
          </Stack>

          {/* Right side */}
          {isAuthenticated ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                component={NavLink}
                to="/profile"
                className={({ isActive }) => (isActive ? "active" : "")}
                sx={navBtnSx}
              >
                Προφίλ
              </Button>
              <LogoutButton />
            </Stack>
          ) : null}
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          bgcolor: "background.default",
          minHeight: "calc(100vh - 64px)",
          py: 2,
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route path="/search" element={<PropertySearchPage />} />
          <Route path="/search/properties/:id" element={<PublicPropertyDetails />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <RoleHomeRedirect />
              </RequireAuth>
            }
          />
          <Route
            path="/app/tenant"
            element={
              <RequireAuth>
                <RequireRole allowed={["TENANT"]}>
                  <TenantDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/app/owner"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <OwnerDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/app/admin"
            element={
              <RequireAuth>
                <RequireRole allowed={["ADMIN"]}>
                  <AdminDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/app/admin/users"
            element={
              <RequireAuth>
                <RequireRole allowed={["ADMIN"]}>
                  <AdminUsersPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/preferences"
            element={
              <RequireAuth>
                <RequireRole allowed={["TENANT"]}>
                  <PreferencesPage />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/recommendations"
            element={
              <RequireAuth>
                <RequireRole allowed={["TENANT"]}>
                  <RecommendationsPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/properties"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <PropertyList />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/properties/new"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <PropertyForm mode="create" />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <PropertyDetails />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/properties/:id/edit"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <PropertyForm mode="edit" />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />

          <Route
            path="/tenants"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <TenantList />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/tenants/new"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <TenantForm />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/contracts"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <ContractList />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/contracts/new"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <ContractForm />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/contracts/:id"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <ContractDetails />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/contracts/:id/edit"
            element={
              <RequireAuth>
                <RequireRole allowed={["OWNER", "ADMIN"]}>
                  <ContractEditForm />
                </RequireRole>
              </RequireAuth>
            }
          />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;