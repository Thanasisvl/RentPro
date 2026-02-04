import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";

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

function normalizeRole(raw) {
  const r = String(raw || "").toUpperCase().trim();
  if (r === "ADMIN") return "ADMIN";
  if (r === "OWNER") return "OWNER";
  // backend might use USER/TENANT; treat unknown as tenant for UX
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
    return <Navigate to="/app" replace />;
  }
  return children;
}

function App() {
  const isAuthenticated = !!getAccessToken();
  const role = normalizeRole(getUserRole());
  const homeTo = isAuthenticated ? "/app" : "/";
  const homeLabel = isAuthenticated ? "Πίνακας" : "Αρχική";
  const homeLabelWithRole = isAuthenticated ? `Πίνακας · ${roleLabel(role)}` : homeLabel;

  return (
    <Router>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            RentPro
          </Typography>

          <Button color="inherit" component={Link} to={homeTo}>
            {homeLabelWithRole}
          </Button>

          {isAuthenticated ? (
            <>
              {role === "TENANT" ? (
                <>
                  <Button color="inherit" component={Link} to="/search">
                    Αναζήτηση
                  </Button>
                  <Button color="inherit" component={Link} to="/preferences">
                    Προτιμήσεις
                  </Button>
                  <Button color="inherit" component={Link} to="/recommendations">
                    Προτάσεις
                  </Button>
                </>
              ) : (
                <>
                  <Button color="inherit" component={Link} to="/properties">
                    Ακίνητα
                  </Button>
                  <Button color="inherit" component={Link} to="/tenants">
                    Ενοικιαστές
                  </Button>
                  <Button color="inherit" component={Link} to="/contracts">
                    Συμβόλαια
                  </Button>
                  {role === "ADMIN" ? (
                    <Button color="inherit" component={Link} to="/app/admin">
                      Διαχείριση
                    </Button>
                  ) : null}
                </>
              )}

              <Button color="inherit" component={Link} to="/profile">
                Προφίλ
              </Button>

              <LogoutButton />
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/search">
                Αναζήτηση
              </Button>
              <Button color="inherit" component={Link} to="/login">
                Σύνδεση
              </Button>
              <Button color="inherit" component={Link} to="/register">
                Εγγραφή
              </Button>
            </>
          )}
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