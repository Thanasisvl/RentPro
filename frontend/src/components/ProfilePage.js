import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import api from "../api";

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profile, setProfile] = useState({
    id: null,
    username: "",
    email: "",
    full_name: "",
    role: "",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const res = await api.get("/users/me");
        if (!mounted) return;

        setProfile({
          id: res.data?.id ?? null,
          username: res.data?.username ?? "",
          email: res.data?.email ?? "",
          full_name: res.data?.full_name ?? "",
          role: res.data?.role ?? "",
        });
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.detail ? String(e.response.data.detail) : "Failed to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        email: profile.email,
        full_name: profile.full_name,
        // username/role intentionally NOT sent
      };

      const res = await api.put("/users/me", payload);

      // sync back what backend returns
      setProfile((p) => ({
        ...p,
        username: res.data?.username ?? p.username,
        email: res.data?.email ?? p.email,
        full_name: res.data?.full_name ?? p.full_name,
        role: res.data?.role ?? p.role,
      }));

      setSuccess("Profile updated.");
    } catch (e) {
      setError(e?.response?.data?.detail ? String(e.response.data.detail) : "Update failed.");
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Paper elevation={3} sx={{ p: 4, width: 520 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Profile
        </Typography>

        {loading && <Alert severity="info" sx={{ mb: 2 }}>Loading…</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={onSave}>
          <TextField
            label="Username"
            value={profile.username}
            fullWidth
            margin="normal"
            disabled
          />

          <TextField
            label="Role"
            value={profile.role}
            fullWidth
            margin="normal"
            disabled
          />

          <TextField
            label="Email"
            value={profile.email}
            onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="Full name"
            value={profile.full_name}
            onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
            fullWidth
            margin="normal"
            required
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            Save
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default ProfilePage;