import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const KNOWN_FIELDS = new Set([
  "area",
  "type",
  "min_price",
  "max_price",
  "min_size",
  "max_size",
  "offset",
  "limit",
]);

function pickFieldFromLoc(loc) {
  // loc can be like: ["query","min_price"] or ["min_price"] or mixed
  if (!Array.isArray(loc)) return null;
  for (let i = loc.length - 1; i >= 0; i--) {
    const seg = loc[i];
    if (typeof seg === "string" && KNOWN_FIELDS.has(seg)) return seg;
  }
  return null;
}

function parse422(detail) {
  const out = { general: "Μη έγκυρα φίλτρα αναζήτησης.", fieldErrors: {} };

  if (!detail) return out;
  if (typeof detail === "string") return { general: detail, fieldErrors: {} };
  if (!Array.isArray(detail)) return out;

  const messages = [];
  const setPair = (a, b, msg) => {
    out.fieldErrors[a] = msg;
    out.fieldErrors[b] = msg;
    messages.push(msg);
  };

  for (const e of detail) {
    const raw = (e?.msg || "").toString();
    const field = pickFieldFromLoc(e?.loc);

    // UC-03 range rules (model_validator messages)
    if (raw.includes("min_price must be <= max_price")) {
      setPair(
        "min_price",
        "max_price",
        "Το ελάχιστο ενοίκιο πρέπει να είναι μικρότερο ή ίσο από το μέγιστο."
      );
      continue;
    }
    if (raw.includes("min_size must be <= max_size")) {
      setPair(
        "min_size",
        "max_size",
        "Το ελάχιστο μέγεθος (τ.μ.) πρέπει να είναι μικρότερο ή ίσο από το μέγιστο."
      );
      continue;
    }

    // Generic friendly mappings (pydantic msgs vary; keep tolerant)
    let friendly = raw;

    if (raw.toLowerCase().includes("valid number") || raw.toLowerCase().includes("float")) {
      friendly = "Η τιμή πρέπει να είναι αριθμός.";
    } else if (raw.toLowerCase().includes("greater than 0") || raw.toLowerCase().includes("gt")) {
      friendly = "Η τιμή πρέπει να είναι μεγαλύτερη από 0.";
    } else if (raw.toLowerCase().includes("greater than or equal to 0") || raw.toLowerCase().includes("ge")) {
      friendly = "Η τιμή πρέπει να είναι μεγαλύτερη ή ίση από 0.";
    } else if (raw.toLowerCase().includes("less than or equal to 100") || raw.toLowerCase().includes("le")) {
      friendly = "Το 'Ανά σελίδα' πρέπει να είναι έως 100.";
    } else if (raw.toLowerCase().includes("at least 1 character") || raw.toLowerCase().includes("min_length")) {
      friendly = "Το πεδίο δεν πρέπει να είναι κενό.";
    } else if (raw.includes("must not be blank")) {
      friendly = "Το πεδίο δεν πρέπει να είναι κενό.";
    }

    if (field) {
      out.fieldErrors[field] = friendly || "Μη έγκυρη τιμή.";
    }
    if (friendly) messages.push(friendly);
  }

  const unique = Array.from(new Set(messages)).filter(Boolean);
  out.general = unique.length ? unique.join(" ") : out.general;
  return out;
}

function PropertySearchPage() {
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const firstRenderRef = useRef(true);

  const [filters, setFilters] = useState({
    area: "",
    type: "",
    min_price: "",
    max_price: "",
    min_size: "",
    max_size: "",
  });

  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [data, setData] = useState(null); // { meta, items }

  const meta = data?.meta || { total: 0, count: 0, offset, limit };
  const total = Number(meta?.total ?? 0);
  const count = Number(meta?.count ?? (Array.isArray(data?.items) ? data.items.length : 0));

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const buildQueryString = (nextOffset, nextLimit) => {
    const p = new URLSearchParams();

    // Filters (backend will coerce/strip area/type; empty strings are fine to omit)
    Object.entries(filters).forEach(([k, v]) => {
      const s = String(v ?? "").trim();
      if (s !== "") p.set(k, s);
    });

    // Pagination
    p.set("offset", String(nextOffset));
    p.set("limit", String(nextLimit));

    return p.toString();
  };

  const runSearch = async ({ nextOffset = offset, nextLimit = limit } = {}) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const qs = buildQueryString(nextOffset, nextLimit);
      const resp = await fetch(`${API_BASE_URL}/properties/search?${qs}`, {
        signal: controller.signal,
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        if (resp.status === 422) {
          const parsed = parse422(json?.detail);
          setError(parsed.general);
          setFieldErrors(parsed.fieldErrors);
        } else {
          setError(json?.detail || "Αποτυχία αναζήτησης.");
        }
        setData(null);
        return false;
      }

      setData(json);
      setOffset(nextOffset); // update paging only on success
      return true;
    } catch (e) {
      if (e?.name === "AbortError") return false;
      setError("Network error");
      setData(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Initial search once (so the page is not empty) + debounce on filter changes
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      runSearch({ nextOffset: 0, nextLimit: limit });
      return;
    }

    // reset paging when filters change
    setOffset(0);

    const t = setTimeout(() => {
      runSearch({ nextOffset: 0, nextLimit: limit });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const handleLimitChange = async (newLimit) => {
    setLimit(newLimit);
    setOffset(0);
    await runSearch({ nextOffset: 0, nextLimit: newLimit });
  };

  const onPrev = async () => {
    const next = Math.max(0, offset - limit);
    await runSearch({ nextOffset: next, nextLimit: limit });
  };

  const onNext = async () => {
    const next = offset + limit;
    await runSearch({ nextOffset: next, nextLimit: limit });
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + count, total);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        Αναζήτηση Ακινήτου
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Περιοχή"
              fullWidth
              value={filters.area}
              onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
              error={!!fieldErrors.area}
              helperText={fieldErrors.area || ""}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Τύπος"
              fullWidth
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              error={!!fieldErrors.type}
              helperText={fieldErrors.type || ""}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Min Τιμή"
              fullWidth
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              value={filters.min_price}
              onChange={(e) => setFilters((f) => ({ ...f, min_price: e.target.value }))}
              error={!!fieldErrors.min_price}
              helperText={fieldErrors.min_price || ""}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Max Τιμή"
              fullWidth
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              value={filters.max_price}
              onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
              error={!!fieldErrors.max_price}
              helperText={fieldErrors.max_price || ""}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Min Τ.μ."
              fullWidth
              type="number"
              inputProps={{ step: "0.1", min: 0 }}
              value={filters.min_size}
              onChange={(e) => setFilters((f) => ({ ...f, min_size: e.target.value }))}
              error={!!fieldErrors.min_size}
              helperText={fieldErrors.min_size || ""}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Max Τ.μ."
              fullWidth
              type="number"
              inputProps={{ step: "0.1", min: 0 }}
              value={filters.max_size}
              onChange={(e) => setFilters((f) => ({ ...f, max_size: e.target.value }))}
              error={!!fieldErrors.max_size}
              helperText={fieldErrors.max_size || ""}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!fieldErrors.limit}>
              <InputLabel id="limit-label">Ανά σελίδα</InputLabel>
              <Select
                labelId="limit-label"
                label="Ανά σελίδα"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} display="flex" justifyContent="flex-end" alignItems="center">
            <Button
              variant="contained"
              onClick={() => runSearch({ nextOffset: 0, nextLimit: limit })}
              disabled={loading}
            >
              Αναζήτηση
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          <Typography>Φόρτωση...</Typography>
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {data && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">
              {total === 0 ? "Σύνολο: 0" : `Εμφάνιση ${pageStart}-${pageEnd} από ${total}`}
            </Typography>

            <Box display="flex" gap={1}>
              <Button variant="outlined" onClick={onPrev} disabled={!canPrev || loading}>
                Προηγ.
              </Button>
              <Button variant="outlined" onClick={onNext} disabled={!canNext || loading}>
                Επόμ.
              </Button>
            </Box>
          </Box>

          {Array.isArray(data.items) && data.items.length === 0 ? (
            <Typography>
              Δεν βρέθηκαν αποτελέσματα. Δοκίμασε να χαλαρώσεις τα φίλτρα.
            </Typography>
          ) : (
            <List>
              {data.items.map((p) => (
                <ListItemButton key={p.id} onClick={() => navigate(`/search/properties/${p.id}`)}>
                  <ListItemText
                    primary={p.title}
                    secondary={`${p.address} • ${p.type} • ${p.size} τ.μ. • €${p.price}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Container>
  );
}

export default PropertySearchPage;