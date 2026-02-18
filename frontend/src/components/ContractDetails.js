import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Button,
  Divider,
  Chip,
} from "@mui/material";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

function Row({ label, value }) {
  return (
    <Box display="flex" justifyContent="space-between" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value ?? "-"}
      </Typography>
    </Box>
  );
}

function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contract, setContract] = useState(null);
  const [property, setProperty] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const propertyStatus = property?.status || null;
  const isPropertyAvailable = propertyStatus === "AVAILABLE";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/contracts/${id}`);
        const c = res.data;
        setContract(c);

        // Resolve "labels" for thesis UX (address + tenant name).
        // If these fail, we fall back to IDs in the UI.
        const [pRes, tRes] = await Promise.allSettled([
          api.get(`/properties/${c?.property_id}`),
          api.get(`/tenants/${c?.tenant_id}`),
        ]);
        if (pRes.status === "fulfilled") setProperty(pRes.value?.data ?? null);
        if (tRes.status === "fulfilled") setTenant(tRes.value?.data ?? null);
      } catch (e) {
        const s = e?.response?.status;
        if (s === 404) setError("Το συμβόλαιο δεν βρέθηκε.");
        else if (s === 403) setError("Δεν επιτρέπεται η προβολή.");
        else setError("Αποτυχία φόρτωσης συμβολαίου.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const openPdf = async () => {
    setPdfBusy(true);
    setError("");
    try {
      const res = await api.get(`/contracts/${id}/pdf`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
    } catch (e) {
      const s = e?.response?.status;
      if (s === 404) setError("Δεν υπάρχει PDF για αυτό το συμβόλαιο.");
      else if (s === 403) setError("Δεν επιτρέπεται η προβολή PDF.");
      else setError("Αποτυχία προβολής PDF.");
    } finally {
      setPdfBusy(false);
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
    <PageContainer>
      <PageHeader
        title={`Συμβόλαιο #${id}`}
        description="Λεπτομέρειες συμβολαίου μίσθωσης."
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate("/contracts")}>
              Πίσω
            </Button>
            <Button
              variant="contained"
              component={RouterLink}
              to={`/contracts/${id}/edit`}
            >
              Επεξεργασία
            </Button>
          </Stack>
        }
      />

      <Paper sx={{ p: 3, maxWidth: 860, mx: "auto" }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!contract ? (
          <Alert severity="info">Δεν υπάρχουν δεδομένα.</Alert>
        ) : (
          <>
            <Stack spacing={1.2}>
              <Row label="Κατάσταση" value={contract.status} />
              <Divider />
              <Row
                label="Ακίνητο (Διεύθυνση)"
                value={property?.address || `#${contract.property_id}`}
              />
              <Box display="flex" justifyContent="space-between" gap={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Κατάσταση ακινήτου
                </Typography>
                {propertyStatus ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={isPropertyAvailable ? "Διαθέσιμο" : "Μη διαθέσιμο"}
                      color={isPropertyAvailable ? "success" : "warning"}
                      variant={isPropertyAvailable ? "filled" : "outlined"}
                    />
                    <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                      ({propertyStatus})
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                    -
                  </Typography>
                )}
              </Box>
              <Row
                label="Ενοικιαστής"
                value={tenant?.name || `#${contract.tenant_id}`}
              />
              <Divider />
              <Row label="Έναρξη" value={contract.start_date} />
              <Row label="Λήξη" value={contract.end_date} />
              <Row label="Μίσθωμα" value={contract.rent_amount} />
              <Divider />
              <Row label="Δημιουργήθηκε" value={contract.created_at} />
              <Row label="Ενημερώθηκε" value={contract.updated_at} />
              <Row label="Τερματίστηκε" value={contract.terminated_at} />
            </Stack>

            <Stack direction="row" spacing={2} mt={3}>
              <Button
                variant="outlined"
                onClick={openPdf}
                disabled={pdfBusy || !(contract.pdf_url || contract.pdf_file)}
              >
                Προβολή PDF
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </PageContainer>
  );
}

export default ContractDetails;