import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  MenuItem,
  Alert,
  Typography,
  Link,
  Stack,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import logo from "../assets/rentpro_logo_mark.png";

function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/users/register", {
        username,
        email,
        full_name: fullName,
        password,
        role,
      });
      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(`Αποτυχία εγγραφής${detail ? `: ${detail}` : ""}`);
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
              Δημιούργησε λογαριασμό
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
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
              size="small"
            />
            <TextField
              label="Ονοματεπώνυμο"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
              margin="normal"
              required
              size="small"
            />
            <TextField
              select
              label="Τύπος λογαριασμού"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
              margin="normal"
              required
              size="small"
            >
              <MenuItem value="USER">Ενοικιαστής</MenuItem>
              <MenuItem value="OWNER">Ιδιοκτήτης</MenuItem>
            </TextField>
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
              Εγγραφή
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
              Έχεις ήδη λογαριασμό;{" "}
              <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
                Σύνδεση
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

export default RegisterForm;
