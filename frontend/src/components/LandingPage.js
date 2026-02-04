import React from "react";
import { useNavigate } from "react-router-dom";
import { Paper, Typography, Button, Stack } from "@mui/material";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";
import { getAccessToken, getUserRole } from "../api";

function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = !!getAccessToken();
  const role = String(getUserRole() || "").toUpperCase().trim();

  const go = (path) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(path);
  };

  return (
    <PageContainer>
      <PageHeader
        title="RentPro"
        description="Δημόσια αναζήτηση ακινήτων ή σύνδεση για πρόσβαση στις λειτουργίες ανά ρόλο."
      />

      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button variant="outlined" onClick={() => navigate("/search")}>
            Αναζήτηση
          </Button>

          {!isAuthenticated ? (
            <>
              <Button variant="contained" onClick={() => navigate("/login")}>
                Σύνδεση
              </Button>
              <Button variant="outlined" onClick={() => navigate("/register")}>
                Εγγραφή
              </Button>
            </>
          ) : (
            <>
              <Button variant="contained" onClick={() => navigate("/app")}>
                Πήγαινε στον πίνακα
              </Button>
              {role !== "OWNER" && role !== "ADMIN" ? (
                <>
                  <Button variant="outlined" onClick={() => navigate("/preferences")}>
                    Προτιμήσεις (AHP)
                  </Button>
                  <Button variant="outlined" onClick={() => navigate("/recommendations")}>
                    Προτάσεις
                  </Button>
                </>
              ) : null}
            </>
          )}
        </Stack>
      </Paper>
    </PageContainer>
  );
}

export default LandingPage;