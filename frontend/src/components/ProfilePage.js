import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Button, Alert, Stack } from "@mui/material";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

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
        setError(
          e?.response?.data?.detail
            ? String(e.response.data.detail)
            : "Αποτυχία φόρτωσης προφίλ."
        );
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

      setSuccess("Το προφίλ ενημερώθηκε.");
    } catch (e) {
      setError(
        e?.response?.data?.detail ? String(e.response.data.detail) : "Αποτυχία ενημέρωσης."
      );
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Προφίλ"
        description="Ενημέρωση βασικών στοιχείων προφίλ (FR‑4)."
      />

      <Paper elevation={3} sx={{ p: 4, maxWidth: 560, mx: "auto" }}>
        <Stack spacing={2}>

          {loading && <Alert severity="info">Φόρτωση…</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <form onSubmit={onSave}>
          <TextField
            label="Όνομα χρήστη"
            value={profile.username}
            fullWidth
            margin="normal"
            disabled
          />

          <TextField
            label="Ρόλος"
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
            label="Ονοματεπώνυμο"
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
            Αποθήκευση
          </Button>
          </form>
        </Stack>
      </Paper>
    </PageContainer>
  );
}

export default ProfilePage;