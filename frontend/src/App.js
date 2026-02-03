import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";

import LandingPage from "./components/LandingPage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import LogoutButton from "./components/LogoutButton";
import RequireAuth from "./components/RequireAuth";

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

function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            RentPro
          </Typography>

          <Button color="inherit" component={Link} to="/">
            Home
          </Button>

          <Button color="inherit" component={Link} to="/search">
            Search
          </Button>

          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/preferences">
                Preferences
              </Button>
              <Button color="inherit" component={Link} to="/recommendations">
                Recommendations
              </Button>

              <Button color="inherit" component={Link} to="/properties">
                Properties
              </Button>
              <Button color="inherit" component={Link} to="/tenants">
                Tenants
              </Button>

              <Button color="inherit" component={Link} to="/contracts">
                Contracts
              </Button>

              <LogoutButton />
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>
              <Button color="inherit" component={Link} to="/register">
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 2 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          <Route path="/search" element={<PropertySearchPage />} />
          <Route path="/search/properties/:id" element={<PublicPropertyDetails />} />

          <Route
            path="/preferences"
            element={
              <RequireAuth>
                <PreferencesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/recommendations"
            element={
              <RequireAuth>
                <RecommendationsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/properties"
            element={
              <RequireAuth>
                <PropertyList />
              </RequireAuth>
            }
          />
          <Route
            path="/properties/new"
            element={
              <RequireAuth>
                <PropertyForm mode="create" />
              </RequireAuth>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <RequireAuth>
                <PropertyDetails />
              </RequireAuth>
            }
          />
          <Route
            path="/properties/:id/edit"
            element={
              <RequireAuth>
                <PropertyForm mode="edit" />
              </RequireAuth>
            }
          />

          <Route
            path="/tenants"
            element={
              <RequireAuth>
                <TenantList />
              </RequireAuth>
            }
          />
          <Route
            path="/tenants/new"
            element={
              <RequireAuth>
                <TenantForm />
              </RequireAuth>
            }
          />

          <Route
            path="/contracts"
            element={
              <RequireAuth>
                <ContractList />
              </RequireAuth>
            }
          />
          <Route
            path="/contracts/new"
            element={
              <RequireAuth>
                <ContractForm />
              </RequireAuth>
            }
          />
          <Route
            path="/contracts/:id/edit"
            element={
              <RequireAuth>
                <ContractEditForm />
              </RequireAuth>
            }
          />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;