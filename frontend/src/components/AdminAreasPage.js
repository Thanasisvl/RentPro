import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Stack,
  Switch,
} from "@mui/material";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

export default function AdminAreasPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [toast, setToast] = React.useState(null); // { severity, message }
  const [items, setItems] = React.useState([]); // areas

  const [createForm, setCreateForm] = React.useState({
    code: "",
    name: "",
    area_score: "",
    is_active: true,
  });
  const [creating, setCreating] = React.useState(false);

  const [draft, setDraft] = React.useState({}); // id -> { area_score, name, is_active }
  const [saving, setSaving] = React.useState({}); // id -> boolean

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/areas/admin");
      const arr = Array.isArray(res.data) ? res.data : [];
      setItems(arr);
      // initialize drafts
      const next = {};
      for (const a of arr) {
        next[a.id] = {
          name: a.name ?? "",
          area_score: a.area_score ?? 0,
          is_active: Boolean(a.is_active),
        };
      }
      setDraft(next);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setError("Δεν έχεις δικαίωμα πρόσβασης στις περιοχές.");
      else setError("Αποτυχία φόρτωσης περιοχών.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onDraftChange = (id, key) => (e) => {
    const value = key === "is_active" ? e.target.checked : e.target.value;
    setDraft((d) => ({
      ...d,
      [id]: { ...(d[id] || {}), [key]: value },
    }));
  };

  const onCreateChange = (key) => (e) => {
    const value = key === "is_active" ? e.target.checked : e.target.value;
    setCreateForm((p) => ({ ...p, [key]: value }));
  };

  const createArea = async () => {
    setCreating(true);
    setError("");
    try {
      const payload = {
        code: String(createForm.code || "").trim().toUpperCase(),
        name: String(createForm.name || "").trim(),
        area_score: Number(createForm.area_score),
        is_active: Boolean(createForm.is_active),
      };
      const res = await api.post("/areas/", payload);
      const a = res.data;
      setItems((prev) => [a, ...prev]);
      setDraft((prev) => ({
        ...prev,
        [a.id]: {
          name: a.name ?? payload.name,
          area_score: a.area_score ?? payload.area_score,
          is_active: Boolean(a.is_active),
        },
      }));
      setCreateForm({ code: "", name: "", area_score: "", is_active: true });
      setToast({ severity: "success", message: "Δημιουργήθηκε νέα περιοχή." });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setError("Δεν έχεις δικαίωμα να δημιουργήσεις περιοχές.");
      else if (status === 422) setError("Μη έγκυρα στοιχεία (π.χ. κενά/λάθος score).");
      else if (status === 400) setError("Αποτυχία δημιουργίας (πιθανό duplicate code).");
      else setError("Αποτυχία δημιουργίας.");
    } finally {
      setCreating(false);
    }
  };

  const saveRow = async (a) => {
    const id = a.id;
    setSaving((s) => ({ ...s, [id]: true }));
    setError("");
    try {
      const d = draft[id] || {};
      const payload = {};
      if (typeof d.name === "string") payload.name = String(d.name).trim();
      if (d.area_score !== "" && d.area_score !== null && d.area_score !== undefined) {
        payload.area_score = Number(d.area_score);
      }
      if (typeof d.is_active === "boolean") payload.is_active = d.is_active;

      const res = await api.put(`/areas/${id}`, payload);
      // Update local item
      setItems((prev) => prev.map((x) => (x.id === id ? res.data : x)));
      setDraft((prev) => ({
        ...prev,
        [id]: {
          name: res.data?.name ?? d.name ?? "",
          area_score: res.data?.area_score ?? d.area_score ?? 0,
          is_active: Boolean(res.data?.is_active ?? d.is_active),
        },
      }));
      setToast({ severity: "success", message: "Αποθηκεύτηκε." });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setError("Δεν έχεις δικαίωμα να ενημερώσεις περιοχές.");
      else if (status === 422) setError("Μη έγκυρα στοιχεία περιοχής.");
      else setError("Αποτυχία αποθήκευσης.");
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
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
        title="Περιοχές (Areas)"
        description="Διαχείριση του κεντρικού λεξικού περιοχών και του area score."
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => load()}>
              Ανανέωση
            </Button>
            <Button variant="outlined" onClick={() => navigate("/app/admin")}>
              Πίσω
            </Button>
          </Stack>
        }
      />

      <Paper sx={{ p: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Νέα περιοχή
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <TextField
              label="Code (unique)"
              value={createForm.code}
              onChange={onCreateChange("code")}
              size="small"
              sx={{ minWidth: 200 }}
              helperText="π.χ. MAROUSI"
            />
            <TextField
              label="Όνομα"
              value={createForm.name}
              onChange={onCreateChange("name")}
              size="small"
              sx={{ minWidth: 240 }}
            />
            <TextField
              label="Area score"
              type="number"
              value={createForm.area_score}
              onChange={onCreateChange("area_score")}
              size="small"
              sx={{ width: 160 }}
              inputProps={{ step: "0.1", min: "0" }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">Active</Typography>
              <Switch checked={createForm.is_active} onChange={onCreateChange("is_active")} />
            </Stack>
            <Button variant="contained" onClick={createArea} disabled={creating}>
              {creating ? "..." : "Δημιουργία"}
            </Button>
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {!error && items.length === 0 ? (
          <Alert severity="info">Δεν υπάρχουν περιοχές.</Alert>
        ) : null}

        {!error && items.length > 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Σύνολο: {items.length}
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Όνομα</TableCell>
                  <TableCell>Area score</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Ενέργειες</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((a) => {
                  const d = draft[a.id] || {};
                  const busy = !!saving[a.id];
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.id}</TableCell>
                      <TableCell>{a.code}</TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <TextField
                          value={d.name ?? a.name ?? ""}
                          onChange={onDraftChange(a.id, "name")}
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                      <TableCell sx={{ width: 160 }}>
                        <TextField
                          value={d.area_score ?? a.area_score ?? 0}
                          onChange={onDraftChange(a.id, "area_score")}
                          size="small"
                          type="number"
                          inputProps={{ step: 0.1, min: 0 }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={
                            typeof d.is_active === "boolean"
                              ? d.is_active
                              : Boolean(a.is_active)
                          }
                          onChange={onDraftChange(a.id, "is_active")}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          onClick={() => saveRow(a)}
                          disabled={busy}
                        >
                          {busy ? "..." : "Αποθήκευση"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : null}
      </Paper>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || "info"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast?.message || ""}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}

