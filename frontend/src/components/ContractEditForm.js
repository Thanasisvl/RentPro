import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  MenuItem,
} from "@mui/material";
import api from "../api";

function ContractEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [status, setStatus] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");

  const [hasPdf, setHasPdf] = useState(false);

  // NEW: tenants for dropdown
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        // Load contract + tenants in parallel
        const [contractRes, tenantsRes] = await Promise.all([
          api.get(`/contracts/${id}`),
          api.get("/tenants/"),
        ]);

        const c = contractRes.data;
        const t = tenantsRes.data || [];

        setTenants(t);

        setPropertyId(String(c.property_id ?? ""));
        setTenantId(String(c.tenant_id ?? ""));
        setStatus(String(c.status ?? ""));

        setStartDate(c.start_date ?? "");
        setEndDate(c.end_date ?? "");
        setRentAmount(String(c.rent_amount ?? ""));
        setHasPdf(Boolean(c.pdf_url || c.pdf_file));
      } catch {
        setError("Αποτυχία φόρτωσης συμβολαίου/ενοικιαστών.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.put(`/contracts/${id}`, {
        tenant_id: Number(tenantId), // NEW: allow change
        start_date: startDate,
        end_date: endDate,
        rent_amount: Number(rentAmount),
      });
      navigate("/contracts");
    } catch (err) {
      const s = err?.response?.status;
      if (s === 422) setError("Μη έγκυρα στοιχεία (tenant/ημ/νίες ή ποσό).");
      else if (s === 409) setError("Δεν επιτρέπεται ενημέρωση (π.χ. μη ACTIVE συμβόλαιο).");
      else if (s === 403) setError("Δεν επιτρέπεται η ενέργεια.");
      else setError("Αποτυχία ενημέρωσης συμβολαίου.");
    } finally {
      setSubmitting(false);
    }
  };

  const openPdf = async () => {
    setError("");
    try {
      const res = await api.get(`/contracts/${id}/pdf`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
    } catch (err) {
      const s = err?.response?.status;
      if (s === 404) setError("Δεν υπάρχει PDF για αυτό το συμβόλαιο.");
      else if (s === 403) setError("Δεν επιτρέπεται η προβολή PDF.");
      else setError("Αποτυχία προβολής PDF.");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box mt={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 3, width: "90%", maxWidth: 640 }}>
        <Typography variant="h5" gutterBottom>
          Επεξεργασία Συμβολαίου #{id}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <TextField label="Property ID" value={propertyId} fullWidth margin="normal" disabled />

          {/* CHANGED: Tenant dropdown (instead of disabled text field) */}
          <TextField
            select
            label="Tenant"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            fullWidth
            margin="normal"
            required
            disabled={submitting}
            helperText="Μπορείς να αλλάξεις tenant (εφόσον ανήκει στον ίδιο owner)."
          >
            {tenants.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>
                {t.name} (#{t.id}, AFM: {t.afm})
              </MenuItem>
            ))}
          </TextField>

          <TextField label="Status" value={status} fullWidth margin="normal" disabled />

          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
            disabled={submitting}
          />

          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
            disabled={submitting}
          />

          <TextField
            label="Rent Amount"
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
            fullWidth
            margin="normal"
            required
            disabled={submitting}
          />

          <Stack direction="row" spacing={2} mb={2}>
            <Button variant="outlined" onClick={openPdf} disabled={!hasPdf || submitting}>
              PDF
            </Button>
          </Stack>

          <Stack direction="row" spacing={2} mt={3}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
            <Button variant="outlined" onClick={() => navigate("/contracts")} disabled={submitting}>
              Ακύρωση
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}

export default ContractEditForm;