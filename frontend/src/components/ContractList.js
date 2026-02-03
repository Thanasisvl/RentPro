import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api from "../api";

function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/contracts/");
      setContracts(res.data || []);
    } catch (e) {
      setError("Αποτυχία φόρτωσης συμβολαίων.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
      else setError("Αποτυχία διαγραφής συμβολαίου.");
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
      <Paper sx={{ p: 3, width: "95%", maxWidth: 1100 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Συμβόλαια</Typography>
          <Button variant="contained" component={RouterLink} to="/contracts/new">
            Νέο Συμβόλαιο
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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