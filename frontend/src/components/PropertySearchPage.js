import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Slider,
  Pagination,
  Skeleton,
  TextField,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import PropertyCard from "./PropertyCard";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const PROPERTY_TYPES = ["", "STUDIO", "APARTMENT", "MAISONETTE", "DETACHED_HOUSE"];

const PRICE_MIN = 0;
const PRICE_MAX = 5000;
const PRICE_STEP = 50;

const SIZE_MIN = 0;
const SIZE_MAX = 300;
const SIZE_STEP = 5;

const SORT_OPTIONS = [
  { value: "", label: "Προεπιλογή (νεότερα)" },
  { value: "PRICE_ASC", label: "Τιμή ↑" },
  { value: "PRICE_DESC", label: "Τιμή ↓" },
  { value: "SIZE_ASC", label: "Εμβαδόν ↑" },
  { value: "SIZE_DESC", label: "Εμβαδόν ↓" },
];

function formatEur(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function clampRange(value, min, max) {
  if (!Array.isArray(value) || value.length < 2) return [min, max];
  const [a, b] = value;
  const lo = Math.max(min, Math.min(max, Number(a)));
  const hi = Math.max(min, Math.min(max, Number(b)));
  return lo <= hi ? [lo, hi] : [hi, lo];
}

function applySort(items, sort) {
  const arr = Array.isArray(items) ? [...items] : [];
  if (!sort) return arr;

  const key = sort;
  const byNum = (get, dir) =>
    arr.sort((x, y) => {
      const a = Number(get(x));
      const b = Number(get(y));
      const aa = Number.isFinite(a) ? a : -Infinity;
      const bb = Number.isFinite(b) ? b : -Infinity;
      return dir === "asc" ? aa - bb : bb - aa;
    });

  if (key === "PRICE_ASC") return byNum((p) => p?.price, "asc");
  if (key === "PRICE_DESC") return byNum((p) => p?.price, "desc");
  if (key === "SIZE_ASC") return byNum((p) => p?.size, "asc");
  if (key === "SIZE_DESC") return byNum((p) => p?.size, "desc");
  return arr;
}

function PropertyCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ overflow: "hidden" }}>
      <Skeleton variant="rectangular" height={140} />
      <CardContent>
        <Skeleton width="70%" />
        <Skeleton width="45%" />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          <Skeleton variant="rounded" width={70} height={22} />
          <Skeleton variant="rounded" width={90} height={22} />
          <Skeleton variant="rounded" width={60} height={22} />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Skeleton variant="rounded" width={90} height={32} />
          <Skeleton variant="rounded" width={90} height={32} />
          <Skeleton variant="rounded" width={90} height={32} />
        </Stack>
      </CardContent>
    </Card>
  );
}

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
  const abortRef = useRef(null);
  const firstRenderRef = useRef(true);
  const suppressAutoSearchRef = useRef(false);
  const [toast, setToast] = useState(null); // { severity, message }
  const [errorToast, setErrorToast] = useState(null); // { severity, message }

  const SAVED_KEY = "rentpro_saved_properties";
  const COMPARE_KEY = "rentpro_compare_properties";

  const readIds = (key) => {
    try {
      const raw = localStorage.getItem(key);
      const arr = JSON.parse(raw || "[]");
      if (!Array.isArray(arr)) return [];
      return arr.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    } catch {
      return [];
    }
  };

  const [savedIds, setSavedIds] = useState(() => readIds(SAVED_KEY));
  const [compareIds, setCompareIds] = useState(() => readIds(COMPARE_KEY));

  const [filters, setFilters] = useState({
    area: "",
    type: "",
  });

  const [priceRange, setPriceRange] = useState([PRICE_MIN, PRICE_MAX]);
  const [sizeRange, setSizeRange] = useState([SIZE_MIN, SIZE_MAX]);
  const [sort, setSort] = useState("");

  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [gotoPage, setGotoPage] = useState("1");

  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null); // { kind: "validation"|"network"|"server", message }
  const [fieldErrors, setFieldErrors] = useState({});
  const [data, setData] = useState(null); // { meta, items }

  const meta = data?.meta || { total: 0, count: 0, offset, limit };
  const total = Number(meta?.total ?? 0);
  const count = Number(meta?.count ?? (Array.isArray(data?.items) ? data.items.length : 0));

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const buildQueryString = (nextOffset, nextLimit, overrides = {}) => {
    const p = new URLSearchParams();
    const effFilters = overrides.filters ?? filters;
    const effPrice = overrides.priceRange ?? priceRange;
    const effSize = overrides.sizeRange ?? sizeRange;

    // Filters (backend will coerce/strip area/type; empty strings are fine to omit)
    Object.entries(effFilters).forEach(([k, v]) => {
      const s = String(v ?? "").trim();
      if (s !== "") p.set(k, s);
    });

    // Ranges: omit defaults to reduce friction & avoid gt=0 validation for zeros
    const [pMin, pMax] = clampRange(effPrice, PRICE_MIN, PRICE_MAX);
    if (pMin > 0) p.set("min_price", String(pMin));
    if (pMax < PRICE_MAX) p.set("max_price", String(pMax));

    const [sMin, sMax] = clampRange(effSize, SIZE_MIN, SIZE_MAX);
    if (sMin > 0) p.set("min_size", String(sMin));
    if (sMax < SIZE_MAX) p.set("max_size", String(sMax));

    // Pagination
    p.set("offset", String(nextOffset));
    p.set("limit", String(nextLimit));

    return p.toString();
  };

  const runSearch = async (
    { nextOffset = offset, nextLimit = limit } = {},
    overrides = {}
  ) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErrorInfo(null);
    setFieldErrors({});
    setData(null); // show skeletons instead of stale results

    try {
      const qs = buildQueryString(nextOffset, nextLimit, overrides);
      const resp = await fetch(`${API_BASE_URL}/properties/search?${qs}`, {
        signal: controller.signal,
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        if (resp.status === 422) {
          const parsed = parse422(json?.detail);
          setErrorInfo({ kind: "validation", message: parsed.general });
          setFieldErrors(parsed.fieldErrors);
        } else {
          const msg = json?.detail || "Αποτυχία αναζήτησης.";
          setErrorInfo({ kind: "server", message: msg });
          setErrorToast({ severity: "error", message: msg });
        }
        return false;
      }

      setData(json);
      setOffset(nextOffset); // update paging only on success
      return true;
    } catch (e) {
      if (e?.name === "AbortError") return false;
      const msg = "Πρόβλημα δικτύου. Δοκίμασε ξανά.";
      setErrorInfo({ kind: "network", message: msg });
      setErrorToast({ severity: "error", message: msg });
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

    if (suppressAutoSearchRef.current) {
      suppressAutoSearchRef.current = false;
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

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + count, total);

  const currentPage = total === 0 ? 1 : Math.floor(offset / limit) + 1; // 1-indexed for UI
  const pageCount = total === 0 ? 0 : Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    // Keep "go to page" input in sync with current page.
    setGotoPage(String(currentPage));
  }, [currentPage]);

  const itemsSorted = useMemo(() => applySort(data?.items, sort), [data, sort]);

  const resetAll = async () => {
    const nextFilters = { area: "", type: "" };
    const nextPrice = [PRICE_MIN, PRICE_MAX];
    const nextSize = [SIZE_MIN, SIZE_MAX];
    suppressAutoSearchRef.current = true;
    setFilters(nextFilters);
    setPriceRange(nextPrice);
    setSizeRange(nextSize);
    setSort("");
    setOffset(0);
    await runSearch(
      { nextOffset: 0, nextLimit: limit },
      { filters: nextFilters, priceRange: nextPrice, sizeRange: nextSize }
    );
  };

  const activeChips = useMemo(() => {
    const chips = [];
    const area = String(filters.area || "").trim();
    const type = String(filters.type || "").trim();
    const [pMin, pMax] = clampRange(priceRange, PRICE_MIN, PRICE_MAX);
    const [sMin, sMax] = clampRange(sizeRange, SIZE_MIN, SIZE_MAX);

    if (area) {
      chips.push({ key: "area", label: `Περιοχή: ${area}` });
    }
    if (type) {
      chips.push({ key: "type", label: `Τύπος: ${type}` });
    }
    if (pMin > 0 || pMax < PRICE_MAX) {
      const left = pMin > 0 ? formatEur(pMin) : "—";
      const right = pMax < PRICE_MAX ? formatEur(pMax) : "—";
      chips.push({ key: "price", label: `Τιμή: ${left} – ${right}` });
    }
    if (sMin > 0 || sMax < SIZE_MAX) {
      const left = sMin > 0 ? `${sMin} τ.μ.` : "—";
      const right = sMax < SIZE_MAX ? `${sMax} τ.μ.` : "—";
      chips.push({ key: "size", label: `Εμβαδόν: ${left} – ${right}` });
    }
    if (sort) {
      const label = SORT_OPTIONS.find((o) => o.value === sort)?.label || sort;
      chips.push({ key: "sort", label: `Sort: ${label}` });
    }
    return chips;
  }, [filters, priceRange, sizeRange, sort]);

  const deleteChip = async (key) => {
    if (key === "area") setFilters((f) => ({ ...f, area: "" }));
    if (key === "type") setFilters((f) => ({ ...f, type: "" }));
    if (key === "price") {
      const next = [PRICE_MIN, PRICE_MAX];
      setPriceRange(next);
      setOffset(0);
      await runSearch({ nextOffset: 0, nextLimit: limit }, { priceRange: next });
      return;
    }
    if (key === "size") {
      const next = [SIZE_MIN, SIZE_MAX];
      setSizeRange(next);
      setOffset(0);
      await runSearch({ nextOffset: 0, nextLimit: limit }, { sizeRange: next });
      return;
    }
    if (key === "sort") setSort("");
  };

  const onPriceCommit = async (v) => {
    const next = clampRange(v, PRICE_MIN, PRICE_MAX);
    setPriceRange(next);
    setOffset(0);
    await runSearch({ nextOffset: 0, nextLimit: limit }, { priceRange: next });
  };

  const onSizeCommit = async (v) => {
    const next = clampRange(v, SIZE_MIN, SIZE_MAX);
    setSizeRange(next);
    setOffset(0);
    await runSearch({ nextOffset: 0, nextLimit: limit }, { sizeRange: next });
  };

  const goToPageNow = async (raw) => {
    if (!pageCount) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const p = Math.max(1, Math.min(pageCount, Math.floor(n)));
    const nextOffset = (p - 1) * limit;
    await runSearch({ nextOffset, nextLimit: limit });
  };

  const toggleSaved = (p) => {
    const id = Number(p?.id);
    if (!Number.isFinite(id)) return;
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setToast({
        severity: "success",
        message: prev.includes(id) ? "Αφαιρέθηκε από αποθηκευμένα." : "Αποθηκεύτηκε.",
      });
      return next;
    });
  };

  const toggleCompare = (p) => {
    const id = Number(p?.id);
    if (!Number.isFinite(id)) return;
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
        setToast({ severity: "info", message: "Αφαιρέθηκε από σύγκριση." });
        return next;
      }
      if (prev.length >= 3) {
        setToast({ severity: "warning", message: "Μπορείς να συγκρίνεις έως 3 ακίνητα." });
        return prev;
      }
      const next = [...prev, id];
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
      setToast({ severity: "success", message: "Προστέθηκε για σύγκριση." });
      return next;
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Αναζήτηση Ακινήτου"
        description="Δημόσια αναζήτηση διαθέσιμων ακινήτων με φίλτρα (UC‑03)."
      />

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
            <FormControl fullWidth error={!!fieldErrors.type}>
              <InputLabel id="type-label">Τύπος</InputLabel>
              <Select
                labelId="type-label"
                label="Τύπος"
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                {PROPERTY_TYPES.map((t) => (
                  <MenuItem key={t || "<all>"} value={t}>
                    {t || "ALL"}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.type ? (
                <Typography variant="caption" color="error">
                  {fieldErrors.type}
                </Typography>
              ) : null}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Τιμή / μήνα
            </Typography>
            <Slider
              value={priceRange}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              onChange={(_, v) => setPriceRange(clampRange(v, PRICE_MIN, PRICE_MAX))}
              onChangeCommitted={(_, v) => onPriceCommit(v)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => formatEur(v)}
              disableSwap
            />
            {(fieldErrors.min_price || fieldErrors.max_price) ? (
              <Typography variant="caption" color="error">
                {fieldErrors.min_price || fieldErrors.max_price}
              </Typography>
            ) : null}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Εμβαδόν (τ.μ.)
            </Typography>
            <Slider
              value={sizeRange}
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={SIZE_STEP}
              onChange={(_, v) => setSizeRange(clampRange(v, SIZE_MIN, SIZE_MAX))}
              onChangeCommitted={(_, v) => onSizeCommit(v)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v} τ.μ.`}
              disableSwap
            />
            {(fieldErrors.min_size || fieldErrors.max_size) ? (
              <Typography variant="caption" color="error">
                {fieldErrors.min_size || fieldErrors.max_size}
              </Typography>
            ) : null}
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
              {fieldErrors.limit ? (
                <Typography variant="caption" color="error">
                  {fieldErrors.limit}
                </Typography>
              ) : null}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="sort-label">Ταξινόμηση</InputLabel>
              <Select
                labelId="sort-label"
                label="Ταξινόμηση"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value || "<default>"} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" onClick={resetAll} disabled={loading}>
              Επαναφορά φίλτρων
            </Button>
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

      {activeChips.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            divider={<Divider orientation="vertical" flexItem />}
          >
            <Typography variant="body2" color="text.secondary">
              Ενεργά φίλτρα
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {activeChips.map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  onDelete={() => deleteChip(c.key)}
                  variant="outlined"
                />
              ))}
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" variant="text" onClick={resetAll}>
              Καθαρισμός
            </Button>
          </Stack>
        </Paper>
      )}

      {errorInfo && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Alert
            severity={errorInfo.kind === "validation" ? "warning" : "error"}
            icon={<ErrorOutlineOutlinedIcon fontSize="inherit" />}
            action={
              <Stack direction="row" spacing={1}>
                {errorInfo.kind === "validation" ? (
                  <Button color="inherit" size="small" onClick={resetAll}>
                    Επαναφορά φίλτρων
                  </Button>
                ) : null}
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => runSearch({ nextOffset: offset, nextLimit: limit })}
                  disabled={loading}
                >
                  Δοκίμασε ξανά
                </Button>
              </Stack>
            }
          >
            <AlertTitle>
              {errorInfo.kind === "validation" ? "Μη έγκυρα φίλτρα" : "Κάτι πήγε στραβά"}
            </AlertTitle>
            {errorInfo.message}
          </Alert>
        </Paper>
      )}

      {loading && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Φόρτωση αποτελεσμάτων…
            </Typography>
            <CircularProgress size={18} />
          </Box>
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6}>
                <PropertyCardSkeleton />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {!loading && data && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">
              {total === 0 ? "Σύνολο: 0" : `Εμφάνιση ${pageStart}-${pageEnd} από ${total}`}
            </Typography>

            {pageCount > 1 ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Pagination
                  count={pageCount}
                  page={currentPage}
                  onChange={(_, p) => goToPageNow(p)}
                  size="small"
                  shape="rounded"
                  siblingCount={1}
                  boundaryCount={1}
                  disabled={loading}
                />

                <TextField
                  label="Σελίδα"
                  size="small"
                  value={gotoPage}
                  onChange={(e) => setGotoPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") goToPageNow(gotoPage);
                  }}
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                    min: 1,
                    max: pageCount,
                    style: { width: 90 },
                  }}
                  disabled={loading}
                />
                <Button variant="outlined" onClick={() => goToPageNow(gotoPage)} disabled={loading}>
                  Πήγαινε
                </Button>
              </Stack>
            ) : null}
          </Box>

          {Array.isArray(itemsSorted) && itemsSorted.length === 0 ? (
            <Box
              sx={{
                py: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 1,
              }}
            >
              <SearchOffOutlinedIcon color="disabled" sx={{ fontSize: 44, mb: 1 }} />
              <Typography variant="h6">Δεν βρέθηκαν αποτελέσματα</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                Δοκίμασε να χαλαρώσεις τα φίλτρα (π.χ. μεγαλύτερο εύρος τιμής/τ.μ.) ή να αλλάξεις
                περιοχή/τύπο.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={resetAll}>
                  Επαναφορά φίλτρων
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => runSearch({ nextOffset: 0, nextLimit: limit })}
                >
                  Νέα αναζήτηση
                </Button>
              </Stack>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {itemsSorted.map((p) => (
                <Grid key={p.id} item xs={12} sm={6}>
                  <PropertyCard
                    property={p}
                    viewTo={`/search/properties/${p.id}`}
                    saved={savedIds.includes(Number(p.id))}
                    inCompare={compareIds.includes(Number(p.id))}
                    onToggleSave={toggleSaved}
                    onToggleCompare={toggleCompare}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : null}
      </Snackbar>

      <Snackbar
        open={!!errorToast}
        autoHideDuration={3500}
        onClose={() => setErrorToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {errorToast ? (
          <Alert severity={errorToast.severity} variant="filled" onClose={() => setErrorToast(null)}>
            {errorToast.message}
          </Alert>
        ) : null}
      </Snackbar>
    </PageContainer>
  );
}

export default PropertySearchPage;