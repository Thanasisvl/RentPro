import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, TextField, Button, Alert } from "@mui/material";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

function TenantForm() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [afm, setAfm] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const afmOk = /^[0-9]{9}$/.test(String(afm || "").trim());
  const emailOk = String(email || "").trim().includes("@");
  const phoneOk = String(phone || "").trim().length >= 8;
  const canSubmit = String(name || "").trim() && afmOk && emailOk && phoneOk && !submitting;

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
    <PageContainer>
      <PageHeader
        title="Νέος Ενοικιαστής"
        description="Καταχώριση ενοικιαστή (UC‑05)."
      />

      <Paper sx={{ p: 3, maxWidth: 720, mx: "auto" }}>

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
            helperText="Πλήρες όνομα ενοικιαστή."
          />

          <TextField
            label="ΑΦΜ"
            value={afm}
            onChange={(e) => setAfm(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={afm.length > 0 && !afmOk}
            helperText={afm.length === 0 ? "9 ψηφία" : afmOk ? "OK" : "Το ΑΦΜ πρέπει να έχει 9 ψηφία."}
          />

          <TextField
            label="Τηλέφωνο"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={phone.length > 0 && !phoneOk}
            helperText={phone.length === 0 ? "" : phoneOk ? "" : "Δώσε έγκυρο τηλέφωνο."}
          />

          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={email.length > 0 && !emailOk}
            helperText={email.length === 0 ? "" : emailOk ? "" : "Δώσε έγκυρο email."}
          />

          <Box mt={3} display="flex" gap={2}>
            <Button type="submit" variant="contained" disabled={!canSubmit}>
              {submitting ? "Αποθήκευση..." : "Δημιουργία"}
            </Button>
            <Button variant="outlined" onClick={() => navigate("/tenants")} disabled={submitting}>
              Ακύρωση
            </Button>
          </Box>
        </form>
      </Paper>
    </PageContainer>
  );
}

export default TenantForm;