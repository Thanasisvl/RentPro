import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, Button, Stack } from "@mui/material";

function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("token");

  const go = (path) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(path);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          RentPro
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Welcome. Search properties publicly, or login to access owner features and recommendations.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button variant="outlined" onClick={() => navigate("/search")}>
            Search
          </Button>

          {!isAuthenticated ? (
            <>
              <Button variant="contained" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button variant="outlined" onClick={() => navigate("/register")}>
                Register
              </Button>
            </>
          ) : (
            <>
              <Button variant="contained" onClick={() => navigate("/preferences")}>
                Set Preferences (AHP)
              </Button>
              <Button variant="outlined" onClick={() => navigate("/recommendations")}>
                Recommendations
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

export default LandingPage;