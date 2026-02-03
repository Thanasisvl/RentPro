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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/contracts/${id}`);
        const c = res.data;

        setPropertyId(String(c.property_id ?? ""));
        setTenantId(String(c.tenant_id ?? ""));
        setStatus(String(c.status ?? ""));

        setStartDate(c.start_date ?? "");
        setEndDate(c.end_date ?? "");
        setRentAmount(String(c.rent_amount ?? ""));
      } catch {
        setError("Αποτυχία φόρτωσης συμβολαίου.");
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
        start_date: startDate,
        end_date: endDate,
        rent_amount: Number(rentAmount),
      });
      navigate("/contracts");
    } catch (err) {
      const s = err?.response?.status;
      if (s === 422) setError("Μη έγκυρα στοιχεία (ημ/νίες ή ποσό).");
      else if (s === 409) setError("Δεν επιτρέπεται ενημέρωση (π.χ. μη ACTIVE συμβόλαιο).");
      else if (s === 403) setError("Δεν επιτρέπεται η ενέργεια.");
      else setError("Αποτυχία ενημέρωσης συμβολαίου.");
    } finally {
      setSubmitting(false);
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

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={onSubmit}>
          <TextField label="Property ID" value={propertyId} fullWidth margin="normal" disabled />
          <TextField label="Tenant ID" value={tenantId} fullWidth margin="normal" disabled />
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
          />

          <TextField
            label="Rent Amount"
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
            fullWidth
            margin="normal"
            required
          />

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