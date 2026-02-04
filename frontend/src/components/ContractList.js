import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api, { getUserRole } from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

const STATUS_OPTIONS = ["", "ACTIVE", "EXPIRED", "TERMINATED"];

function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null); // { type: "delete"|"terminate", id }

  const isAdmin = getUserRole() === "ADMIN";

  // Filters (L2)
  const [status, setStatus] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [runningToday, setRunningToday] = useState(false);

  // NEW (L4): admin-only
  const [ownerId, setOwnerId] = useState("");

  const params = useMemo(() => {
    const p = {};
    if (status) p.status = status;
    if (propertyId) p.property_id = Number(propertyId);
    if (tenantId) p.tenant_id = Number(tenantId);
    if (runningToday) p.running_today = true;

    if (isAdmin && ownerId) p.owner_id = Number(ownerId);

    return p;
  }, [status, propertyId, tenantId, runningToday, isAdmin, ownerId]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/contracts/", { params });
      setContracts(res.data || []);
    } catch (e) {
      setError("Αποτυχία φόρτωσης συμβολαίων.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const terminateContract = async (id) => {
    setBusyId(id);
    setError("");
    try {
      await api.post(`/contracts/${id}/terminate`);
      await load();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setError("Δεν επιτρέπεται η ενέργεια.");
      else setError("Αποτυχία τερματισμού συμβολαίου.");
    } finally {
      setBusyId(null);
    }
  };

  const requestDelete = (id) => setConfirm({ type: "delete", id });
  const requestTerminate = (id) => setConfirm({ type: "terminate", id });

  const runConfirmed = async () => {
    if (!confirm?.id || !confirm?.type) return;
    const id = confirm.id;
    const type = confirm.type;
    setConfirm(null);

    if (type === "terminate") {
      await terminateContract(id);
      return;
    }

    setBusyId(id);
    setError("");
    try {
      await api.delete(`/contracts/${id}`);
      await load();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setError("Δεν επιτρέπεται η ενέργεια.");
      else if (status === 409)
        setError("Δεν μπορείς να διαγράψεις ACTIVE συμβόλαιο (κάνε τερματισμό).");
      else setError("Αποτυχία διαγραφής συμβολαίου.");
    } finally {
      setBusyId(null);
    }
  };

  // PDF: uses auth endpoint and opens the resulting blob (works even if /uploads is protected later)
  const openPdf = async (id) => {
    setBusyId(id);
    setError("");
    try {
      const res = await api.get(`/contracts/${id}/pdf`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      // optional cleanup later:
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) setError("Δεν υπάρχει PDF για αυτό το συμβόλαιο.");
      else if (status === 403) setError("Δεν επιτρέπεται η προβολή PDF.");
      else setError("Αποτυχία προβολής PDF.");
    } finally {
      setBusyId(null);
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
        title="Συμβόλαια"
        description="Καταχώριση, προβολή και διαχείριση μισθώσεων (UC‑05)."
        actions={
          <Button variant="contained" component={RouterLink} to="/contracts/new">
            Νέο Συμβόλαιο
          </Button>
        }
      />

      <Paper sx={{ p: 3 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* L2 Filters */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <TextField
              select
              label="Κατάσταση"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s || "ΟΛΑ"}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Κωδικός ακινήτου (Property ID)"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            />

            <TextField
              label="Κωδικός ενοικιαστή (Tenant ID)"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={runningToday}
                  onChange={(e) => setRunningToday(e.target.checked)}
                />
              }
              label="Ενεργό σήμερα"
            />

            {isAdmin && (
              <TextField
                label="Κωδικός ιδιοκτήτη (Owner ID) — admin"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
              />
            )}

            <Button variant="outlined" onClick={load}>
              Αναζήτηση
            </Button>
          </Stack>
        </Paper>

        {contracts.length === 0 ? (
          <Alert severity="info">Δεν υπάρχουν συμβόλαια.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Property ID</TableCell>
                <TableCell>Tenant ID</TableCell>
                <TableCell>Κατάσταση</TableCell>
                <TableCell>Έναρξη</TableCell>
                <TableCell>Λήξη</TableCell>
                <TableCell align="right">Μίσθωμα</TableCell>
                <TableCell>PDF</TableCell>
                <TableCell>Ενέργειες</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {contracts.map((c) => {
                const disabled = busyId === c.id;
                const canTerminate = c.status === "ACTIVE";

                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.property_id}</TableCell>
                    <TableCell>{c.tenant_id}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell>{c.start_date}</TableCell>
                    <TableCell>{c.end_date}</TableCell>
                    <TableCell align="right">{c.rent_amount}</TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={disabled}
                        onClick={() => openPdf(c.id)}
                      >
                        PDF
                      </Button>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          component={RouterLink}
                          to={`/contracts/${c.id}`}
                          disabled={disabled}
                        >
                          Προβολή
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          disabled={disabled || !canTerminate}
                          onClick={() => requestTerminate(c.id)}
                        >
                          Τερματισμός
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={disabled}
                          onClick={() => requestDelete(c.id)}
                        >
                          Διαγραφή
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          component={RouterLink}
                          to={`/contracts/${c.id}/edit`}
                          disabled={disabled}
                        >
                          Επεξεργασία
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>
          {confirm?.type === "delete" ? "Επιβεβαίωση διαγραφής" : "Επιβεβαίωση τερματισμού"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm?.type === "delete"
              ? "Θέλεις σίγουρα να διαγράψεις το συμβόλαιο; Η ενέργεια δεν αναιρείται."
              : "Θέλεις σίγουρα να τερματίσεις το συμβόλαιο;"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirm(null)}>
            Ακύρωση
          </Button>
          <Button variant="contained" color="error" onClick={runConfirmed}>
            Επιβεβαίωση
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

export default ContractList;