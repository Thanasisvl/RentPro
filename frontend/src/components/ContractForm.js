import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import api from "../api";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function addYears(d, years) {
  const nd = new Date(d);
  nd.setFullYear(nd.getFullYear() + years);
  return nd;
}

function ContractForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialPropertyId = searchParams.get("propertyId") || "";

  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState(() => toISODate(new Date()));
  const [endDate, setEndDate] = useState(() => toISODate(addYears(new Date(), 1)));
  const [rentAmount, setRentAmount] = useState("");
  const [file, setFile] = useState(null);

  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const [property, setProperty] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(Boolean(initialPropertyId));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => {
    // If we have fetched property and it's not available, block create to avoid 409
    if (property && property.status && property.status !== "AVAILABLE") return false;
    return true;
  }, [property]);

  useEffect(() => {
    const loadTenants = async () => {
      setLoadingTenants(true);
      setError("");
      try {
        const res = await api.get("/tenants");
        setTenants(res.data || []);
      } catch (e) {
        setError("Αποτυχία φόρτωσης ενοικιαστών.");
      } finally {
        setLoadingTenants(false);
      }
    };
    loadTenants();
  }, []);

  useEffect(() => {
    const loadProperty = async () => {
      if (!initialPropertyId) return;

      setLoadingProperty(true);
      try {
        const res = await api.get(`/properties/${initialPropertyId}`);
        setProperty(res.data);
      } catch (e) {
        setProperty(null);
        setError("Αποτυχία φόρτωσης ακινήτου.");
      } finally {
        setLoadingProperty(false);
      }
    };

    loadProperty();
  }, [initialPropertyId]);

  const validatePdf = (f) => {
    if (!f) return null;
    const name = (f.name || "").toLowerCase();
    if (!name.endsWith(".pdf")) return "Μόνο αρχεία PDF επιτρέπονται.";
    if (f.size > MAX_PDF_BYTES) return "Το PDF είναι πολύ μεγάλο (max 5MB).";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const pdfErr = validatePdf(file);
      if (pdfErr) {
        setError(pdfErr);
        return;
      }

      const payload = {
        property_id: Number(propertyId),
        tenant_id: Number(tenantId),
        start_date: startDate,
        end_date: endDate,
        rent_amount: Number(rentAmount),
      };

      const created = await api.post("/contracts/", payload);
      const contractId = created.data?.id;

      if (file && contractId) {
        const form = new FormData();
        form.append("file", file);
        await api.post(`/contracts/${contractId}/upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setSuccess("Το συμβόλαιο δημιουργήθηκε επιτυχώς.");

      // Reset form but keep propertyId if coming from PropertyDetails
      if (!initialPropertyId) setPropertyId("");
      setTenantId("");
      setStartDate(toISODate(new Date()));
      setEndDate(toISODate(addYears(new Date(), 1)));
      setRentAmount("");
      setFile(null);

      // Nice UX: go back to property details if we came from there
      if (initialPropertyId) {
        navigate(`/properties/${initialPropertyId}`);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setError("Το ακίνητο είναι ήδη ενοικιασμένο.");
      else if (status === 403) setError("Δεν επιτρέπεται η ενέργεια.");
      else if (status === 413) setError("Το PDF είναι πολύ μεγάλο (max 5MB).");
      else if (status === 422) setError("Μη έγκυρα στοιχεία. Έλεγξε ημερομηνίες/ποσό.");
      else setError("Αποτυχία δημιουργίας συμβολαίου.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box mt={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 3, width: "90%", maxWidth: 640 }}>
        <Typography variant="h5" gutterBottom>
          Νέο Συμβόλαιο
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {loadingProperty && (
          <Box mb={2} display="flex" alignItems="center" gap={1}>
            <CircularProgress size={18} />
            <Typography variant="body2">Φόρτωση ακινήτου...</Typography>
          </Box>
        )}

        {property && (
          <Alert
            severity={property.status === "AVAILABLE" ? "info" : "warning"}
            sx={{ mb: 2 }}
          >
            Ακίνητο: <b>{property.title}</b> — Status: <b>{property.status}</b>
          </Alert>
        )}

        {!canSubmit && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Δεν μπορείς να δημιουργήσεις νέο συμβόλαιο όταν το ακίνητο δεν είναι διαθέσιμο.
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <TextField
            label="Property ID"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            fullWidth
            margin="normal"
            required
            disabled={Boolean(initialPropertyId)}
          />

          {loadingTenants ? (
            <Box mt={2} display="flex" justifyContent="center">
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TextField
              select
              label="Tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              fullWidth
              margin="normal"
              required
            >
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name || `Tenant #${t.id}`} {t.afm ? `(${t.afm})` : ""}
                </MenuItem>
              ))}
            </TextField>
          )}

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

          <Box mt={2}>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Box>

          <Box mt={3} display="flex" gap={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || loadingTenants || !canSubmit}
            >
              {submitting ? "Αποθήκευση..." : "Δημιουργία"}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default ContractForm;