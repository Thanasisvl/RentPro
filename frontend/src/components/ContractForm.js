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
  Divider,
  Stack,
  Grid,
} from "@mui/material";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

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

  const fieldErrors = useMemo(() => {
    const e = {};
    const pid = Number(propertyId);
    if (!Number.isFinite(pid) || pid <= 0) e.propertyId = "Δώσε έγκυρο Property ID.";

    const tid = Number(tenantId);
    if (!Number.isFinite(tid) || tid <= 0) e.tenantId = "Επίλεξε ενοικιαστή.";

    if (!startDate) e.startDate = "Η ημερομηνία έναρξης είναι υποχρεωτική.";
    if (!endDate) e.endDate = "Η ημερομηνία λήξης είναι υποχρεωτική.";
    if (startDate && endDate && String(endDate) < String(startDate)) {
      e.endDate = "Η λήξη πρέπει να είναι μετά την έναρξη.";
    }

    const rent = Number(rentAmount);
    if (!Number.isFinite(rent) || rent <= 0) e.rentAmount = "Δώσε ποσό > 0.";

    const pdfErr = validatePdf(file);
    if (pdfErr) e.file = pdfErr;
    return e;
  }, [propertyId, tenantId, startDate, endDate, rentAmount, file]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const canSubmit = useMemo(() => {
    // If we have fetched property and it's not available, block create to avoid 409
    if (property && property.status && property.status !== "AVAILABLE") return false;
    return !hasErrors;
  }, [property, hasErrors]);

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
      if (hasErrors) {
        setError("Έλεγξε τα πεδία της φόρμας.");
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
    <PageContainer>
      <PageHeader
        title="Νέο Συμβόλαιο"
        description="Δημιουργία νέας μίσθωσης για συγκεκριμένο ακίνητο (UC‑05)."
      />

      <Paper sx={{ p: 3, maxWidth: 760, mx: "auto" }}>

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
            Ακίνητο: <b>{property.title}</b> — Κατάσταση: <b>{property.status}</b>
          </Alert>
        )}

        {!canSubmit && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Δεν μπορείς να δημιουργήσεις νέο συμβόλαιο όταν το ακίνητο δεν είναι διαθέσιμο.
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Στοιχεία ακινήτου
              </Typography>
              <TextField
                label="Κωδικός ακινήτου (Property ID)"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                fullWidth
                required
                disabled={Boolean(initialPropertyId)}
                error={!!fieldErrors.propertyId}
                helperText={
                  fieldErrors.propertyId ||
                  (initialPropertyId ? "Επιλέχθηκε από το ακίνητο." : "π.χ. 12")
                }
              />
            </Box>

          {loadingTenants ? (
            <Box mt={2} display="flex" justifyContent="center">
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Ενοικιαστής
              </Typography>
              <TextField
                select
                label="Επιλογή ενοικιαστή"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                fullWidth
                required
                error={!!fieldErrors.tenantId}
                helperText={
                  fieldErrors.tenantId || "Επίλεξε τον ενοικιαστή που θα συνδεθεί με τη μίσθωση."
                }
              >
                <MenuItem value="">
                  <em>Επίλεξε…</em>
                </MenuItem>
                {tenants.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    {t.name || `Ενοικιαστής #${t.id}`} {t.afm ? `(${t.afm})` : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Ημερομηνίες
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Έναρξη"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!!fieldErrors.startDate}
                  helperText={fieldErrors.startDate || ""}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Λήξη"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!!fieldErrors.endDate}
                  helperText={fieldErrors.endDate || ""}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Οικονομικά
            </Typography>
            <TextField
              label="Μίσθωμα (€/μήνα)"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              fullWidth
              required
              type="number"
              inputProps={{ min: 0.01, step: "0.01" }}
              error={!!fieldErrors.rentAmount}
              helperText={fieldErrors.rentAmount || "π.χ. 850"}
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              PDF (προαιρετικό)
            </Typography>
            <TextField
              type="file"
              fullWidth
              inputProps={{ accept: "application/pdf,.pdf" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              error={!!fieldErrors.file}
              helperText={fieldErrors.file || "Μόνο PDF έως 5MB."}
            />
          </Box>

          <Box display="flex" gap={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || loadingTenants || !canSubmit}
            >
              {submitting ? "Αποθήκευση..." : "Δημιουργία"}
            </Button>
            <Button variant="outlined" onClick={() => navigate("/contracts")} disabled={submitting}>
              Ακύρωση
            </Button>
          </Box>
          </Stack>
        </form>
      </Paper>
    </PageContainer>
  );
}

export default ContractForm;