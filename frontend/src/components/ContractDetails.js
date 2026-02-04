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
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/contracts/${id}`);
        setContract(res.data);
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
        description="Λεπτομέρειες μίσθωσης (UC‑05)."
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
              <Row label="Κωδικός ακινήτου (Property ID)" value={contract.property_id} />
              <Row label="Κωδικός ενοικιαστή (Tenant ID)" value={contract.tenant_id} />
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