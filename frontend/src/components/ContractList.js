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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api, { getUserRole } from "../api";

const STATUS_OPTIONS = ["", "ACTIVE", "EXPIRED", "TERMINATED"];

function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

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

  const deleteContract = async (id) => {
    const ok = window.confirm("Σίγουρα θέλεις διαγραφή συμβολαίου;");
    if (!ok) return;

    setBusyId(id);
    setError("");
    try {
      await api.delete(`/contracts/${id}`);
      await load();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setError("Δεν επιτρέπεται η ενέργεια.");
      else if (status === 409) setError("Δεν μπορείς να διαγράψεις ACTIVE συμβόλαιο (κάνε terminate).");
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
    <Box mt={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 3, width: "95%", maxWidth: 1200 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Συμβόλαια</Typography>
          <Button variant="contained" component={RouterLink} to="/contracts/new">
            Νέο Συμβόλαιο
          </Button>
        </Box>

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
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s || "ALL"}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Property ID"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            />

            <TextField
              label="Tenant ID"
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
              label="Running today"
            />

            {isAdmin && (
              <TextField
                label="Owner ID (admin)"
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
                <TableCell>Property</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell align="right">Rent</TableCell>
                <TableCell>PDF</TableCell>
                <TableCell>Actions</TableCell>
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
                          color="warning"
                          disabled={disabled || !canTerminate}
                          onClick={() => terminateContract(c.id)}
                        >
                          Terminate
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={disabled}
                          onClick={() => deleteContract(c.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          component={RouterLink}
                          to={`/contracts/${c.id}/edit`}
                          disabled={disabled}
                        >
                          Edit
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
    </Box>
  );
}

export default ContractList;