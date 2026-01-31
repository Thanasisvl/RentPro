import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import LandingPage from './components/LandingPage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import PropertyList from './components/PropertyList';
import TenantList from './components/TenantList';
import RequireAuth from './components/RequireAuth';
import LogoutButton from './components/LogoutButton';

function App() {
  // απλό “isAuthenticated”: υπάρχει token στο localStorage;
  const isAuthenticated = !!localStorage.getItem('token');

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

          {isAuthenticated && (
            <>
              <Button color="inherit" component={Link} to="/properties">
                Properties
              </Button>
              <Button color="inherit" component={Link} to="/tenants">
                Tenants
              </Button>
              <LogoutButton />
            </>
          )}

          {!isAuthenticated && (
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
          <Route
            path="/properties"
            element={
              <RequireAuth>
                <PropertyList />
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
        </Routes>
      </Box>
    </Router>
  );
}

export default App;