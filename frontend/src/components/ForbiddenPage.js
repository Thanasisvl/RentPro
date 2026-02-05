import React from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { getAccessToken } from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!getAccessToken();

  const state = location?.state || {};
  const attemptedPath = state?.attemptedPath;
  const currentRole = state?.currentRole;
  const requiredRoles = state?.requiredRoles;

  return (
    <PageContainer maxWidthPx={760}>
      <PageHeader
        title="Μη εξουσιοδοτημένη πρόσβαση"
        description="Δεν έχεις τα απαραίτητα δικαιώματα για να δεις αυτή τη σελίδα."
        actions={
          <Button variant="outlined" onClick={() => navigate("/app")}>
            Πίσω στον πίνακα
          </Button>
        }
      />

      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Πρόσβαση απορρίφθηκε (403).
        </Alert>

        {(attemptedPath || currentRole || requiredRoles) && (
          <Box sx={{ mb: 2 }}>
            {attemptedPath ? (
              <Typography variant="body2" color="text.secondary">
                Σελίδα: <b>{attemptedPath}</b>
              </Typography>
            ) : null}
            {currentRole ? (
              <Typography variant="body2" color="text.secondary">
                Ρόλος χρήστη: <b>{currentRole}</b>
              </Typography>
            ) : null}
            {Array.isArray(requiredRoles) && requiredRoles.length ? (
              <Typography variant="body2" color="text.secondary">
                Απαιτούμενοι ρόλοι: <b>{requiredRoles.join(", ")}</b>
              </Typography>
            ) : null}
          </Box>
        )}

        {!isAuthenticated ? (
          <Button variant="contained" component={RouterLink} to="/login">
            Σύνδεση
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Αν πιστεύεις ότι πρόκειται για λάθος, δοκίμασε αποσύνδεση/σύνδεση ή επικοινώνησε με τον
            διαχειριστή του συστήματος.
          </Typography>
        )}
      </Paper>
    </PageContainer>
  );
}

