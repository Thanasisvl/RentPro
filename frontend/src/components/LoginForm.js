import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Alert,
  Typography,
  Link,
  Stack,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { login } from "../api";
import PageContainer from "./layout/PageContainer";
import logo from "../assets/rentpro_logo_mark.png";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(username, password);
      navigate("/app");
    } catch (err) {
      if (err.response?.data?.detail) {
        setError("Αποτυχία σύνδεσης: " + err.response.data.detail);
      } else {
        setError("Αποτυχία σύνδεσης.");
      }
    }
  };

  return (
    <PageContainer maxWidthPx={520}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 420,
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <Box
              component="img"
              src={logo}
              alt="RentPro"
              sx={{ width: 48, height: 48, objectFit: "contain" }}
            />
            <Typography variant="h5" fontWeight={700}>
              RentPro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Σύνδεση στο λογαριασμό σου
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Όνομα χρήστη"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              margin="normal"
              required
              size="small"
            />
            <TextField
              label="Κωδικός"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              size="small"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, py: 1.25, borderRadius: 2, fontWeight: 700 }}
            >
              Σύνδεση
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
              Δεν έχεις λογαριασμό;{" "}
              <Link component={RouterLink} to="/register" sx={{ fontWeight: 600 }}>
                Εγγραφή
              </Link>
            </Typography>
            <Button
              variant="text"
              fullWidth
              size="small"
              component={RouterLink}
              to="/"
              sx={{ mt: 1, color: "text.secondary", textTransform: "none" }}
            >
              Πίσω στην αρχική
            </Button>
          </form>
        </Paper>
      </Box>
    </PageContainer>
  );
}

export default LoginForm;
