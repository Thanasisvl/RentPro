import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import api from "../api";

function TenantForm() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [afm, setAfm] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: name.trim(),
        afm: afm.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };

      const resp = await api.post("/tenants/", payload);
      setSuccess("Ο ενοικιαστής δημιουργήθηκε.");

      // πήγαινε στη λίστα (ή σε details αν έχεις route)
      navigate("/tenants");
      return resp.data;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 422) setError("Μη έγκυρα στοιχεία (έλεγξε ΑΦΜ/υποχρεωτικά πεδία).");
      else if (status === 401) setError("Χρειάζεται σύνδεση.");
      else if (status === 403) setError("Δεν επιτρέπεται η ενέργεια.");
      else setError("Αποτυχία δημιουργίας ενοικιαστή.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box mt={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 3, width: "90%", maxWidth: 640 }}>
        <Typography variant="h5" gutterBottom>
          Νέος Ενοικιαστής
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={onSubmit}>
          <TextField
            label="Ονοματεπώνυμο"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="ΑΦΜ"
            value={afm}
            onChange={(e) => setAfm(e.target.value)}
            fullWidth
            margin="normal"
            required
            helperText="9 ψηφία"
          />

          <TextField
            label="Τηλέφωνο"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          <Box mt={3} display="flex" gap={2}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Αποθήκευση..." : "Δημιουργία"}
            </Button>
            <Button variant="outlined" onClick={() => navigate("/tenants")} disabled={submitting}>
              Ακύρωση
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default TenantForm;