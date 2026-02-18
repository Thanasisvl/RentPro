import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

function roleLabel(role) {
  const r = String(role || "").toUpperCase().trim();
  if (r === "ADMIN") return "Διαχειριστής";
  if (r === "OWNER") return "Ιδιοκτήτης";
  return "Ενοικιαστής";
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [users, setUsers] = React.useState([]);

  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("");
  const [page, setPage] = React.useState(1); // 1-indexed
  const [pageSize, setPageSize] = React.useState(20);
  const [total, setTotal] = React.useState(null); // number | null

  const skip = (page - 1) * pageSize;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        skip,
        limit: pageSize,
      };
      if (String(q || "").trim()) params.q = String(q || "").trim();
      if (String(role || "").trim()) params.role = String(role || "").trim();

      const res = await api.get("/users/", { params });
      setUsers(Array.isArray(res.data) ? res.data : []);
      const rawTotal =
        res?.headers?.["x-total-count"] ?? res?.headers?.["X-Total-Count"];
      const n = Number(rawTotal);
      setTotal(Number.isFinite(n) ? n : null);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setError("Δεν έχεις δικαίωμα πρόσβασης στους χρήστες.");
      else setError("Αποτυχία φόρτωσης χρηστών.");
    } finally {
      setLoading(false);
    }
  }, [skip, pageSize, q, role]);

  React.useEffect(() => {
    load();
  }, [load]);

  const pageCount =
    typeof total === "number" ? Math.max(1, Math.ceil(total / pageSize)) : null;

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
        title="Χρήστες"
        description="Εποπτεία και διαχείριση χρηστών."
        actions={
          <Button variant="outlined" onClick={() => navigate("/app/admin")}>
            Πίσω
          </Button>
        }
      />

      <Paper sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
              <TextField
                label="Αναζήτηση (username/email/όνομα)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                size="small"
                sx={{ minWidth: 280 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    load();
                  }
                }}
              />

              <TextField
                select
                label="Ρόλος"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">ΟΛΟΙ</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
                <MenuItem value="OWNER">OWNER</MenuItem>
                <MenuItem value="USER">USER</MenuItem>
              </TextField>

              <TextField
                select
                label="Ανά σελίδα"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                size="small"
                sx={{ minWidth: 140 }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setPage(1);
                  load();
                }}
              >
                Αναζήτηση
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setQ("");
                  setRole("");
                  setPageSize(20);
                  setPage(1);
                }}
              >
                Καθαρισμός
              </Button>
            </Box>
          </Box>
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {!error && users.length === 0 ? (
          <Alert severity="info">Δεν υπάρχουν χρήστες.</Alert>
        ) : null}

        {!error && users.length > 0 ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {typeof total === "number" ? `Σύνολο: ${total}` : `Εμφανίζονται: ${users.length}`}
              </Typography>
              <Button variant="outlined" onClick={load}>
                Ανανέωση
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Ονοματεπώνυμο</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Ρόλος</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roleLabel(u.role)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {pageCount ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_e, next) => setPage(next)}
                  color="primary"
                />
              </Box>
            ) : null}
          </>
        ) : null}
      </Paper>
    </PageContainer>
  );
}

