import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Button,
  Stack,
  Snackbar,
  Slider,
  LinearProgress,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import api from "../api";
import { Link as RouterLink } from "react-router-dom";
import PropertyCard from "./PropertyCard";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

const CRITERIA_META = {
  price: {
    label: "Price (€/month)",
    format: (v) =>
      Number.isFinite(Number(v))
        ? new Intl.NumberFormat("el-GR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(Number(v))
        : "—",
  },
  size: {
    label: "Size (sqm)",
    format: (v) => (Number.isFinite(Number(v)) ? `${Number(v)} τ.μ.` : "—"),
  },
  property_type: {
    label: "Property type",
    format: (_v, it) => it?.property?.type || "—",
  },
  area_score: {
    label: "Area score",
    format: (v) => (Number.isFinite(Number(v)) ? `${Number(v).toFixed(1)}` : "—"),
  },
};

const PROPERTY_TYPE_LABELS = {
  STUDIO: "Γκαρσονιέρα",
  APARTMENT: "Διαμέρισμα",
  MAISONETTE: "Μεζονέτα",
  DETACHED_HOUSE: "Μονοκατοικία",
};

const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "Όλοι οι τύποι" },
  { value: "STUDIO", label: PROPERTY_TYPE_LABELS.STUDIO },
  { value: "APARTMENT", label: PROPERTY_TYPE_LABELS.APARTMENT },
  { value: "MAISONETTE", label: PROPERTY_TYPE_LABELS.MAISONETTE },
  { value: "DETACHED_HOUSE", label: PROPERTY_TYPE_LABELS.DETACHED_HOUSE },
];

// Area filtering uses the areas dictionary (municipality-level) via Property.area_id.

function normalizeWeightsFromDict(criteriaOrder, weightsDict) {
  const w = criteriaOrder.map((k) => Number(weightsDict?.[k] ?? 0));
  const sum = w.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  if (!sum || !Number.isFinite(sum)) return criteriaOrder.map(() => 0);
  return w.map((x) => (Number.isFinite(x) ? x / sum : 0));
}

function applyPriceBoost(criteriaOrder, weights, boost) {
  const idx = criteriaOrder.indexOf("price");
  if (idx < 0) return weights;
  const b = Math.max(0, Math.min(0.6, Number(boost) || 0)); // up to +60%
  const next = [...weights];
  next[idx] = next[idx] * (1 + b);
  const sum = next.reduce((a, x) => a + x, 0);
  return sum > 0 ? next.map((x) => x / sum) : next;
}

function topsisCompute(decisionMatrix, weights, isBenefit) {
  const m = decisionMatrix.length;
  if (!m) return { scores: [], v: [], idealBest: [], idealWorst: [] };
  const n = decisionMatrix[0].length;

  const norms = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += (decisionMatrix[i][j] || 0) ** 2;
    return s > 0 ? Math.sqrt(s) : 1;
  });

  const v = Array.from({ length: m }, () => Array.from({ length: n }, () => 0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const r = (decisionMatrix[i][j] || 0) / norms[j];
      v[i][j] = r * (weights[j] || 0);
    }
  }

  const idealBest = Array.from({ length: n }, () => 0);
  const idealWorst = Array.from({ length: n }, () => 0);
  for (let j = 0; j < n; j++) {
    const col = v.map((row) => row[j]);
    const max = Math.max(...col);
    const min = Math.min(...col);
    if (isBenefit[j]) {
      idealBest[j] = max;
      idealWorst[j] = min;
    } else {
      idealBest[j] = min;
      idealWorst[j] = max;
    }
  }

  const scores = [];
  for (let i = 0; i < m; i++) {
    let dBest = 0;
    let dWorst = 0;
    for (let j = 0; j < n; j++) {
      dBest += (v[i][j] - idealBest[j]) ** 2;
      dWorst += (v[i][j] - idealWorst[j]) ** 2;
    }
    dBest = Math.sqrt(dBest);
    dWorst = Math.sqrt(dWorst);
    const denom = dBest + dWorst;
    const score = denom > 0 ? dWorst / denom : 0;
    scores.push({ score, dBest, dWorst });
  }

  return { scores, v, idealBest, idealWorst };
}

function explainTopBullets({ it, idx, criteriaOrder, weights, isBenefit, vRow, idealBest, idealWorst }) {
  const contributions = criteriaOrder.map((k, j) => {
    const gapBest = Math.abs((vRow?.[j] ?? 0) - (idealBest?.[j] ?? 0));
    const gapWorst = Math.abs((vRow?.[j] ?? 0) - (idealWorst?.[j] ?? 0));
    const advantage = gapWorst - gapBest; // >0 closer to best than worst
    return { key: k, j, advantage, weight: weights[j] || 0 };
  });

  contributions.sort((a, b) => (b.advantage || 0) - (a.advantage || 0));
  const top = contributions.slice(0, 3).filter((x) => x.advantage > 0);
  const values = it?.explain?.topsis?.criteria_values || {};

  const bullets = top.map((c) => {
    const meta = CRITERIA_META[c.key] || { label: c.key, format: (v) => String(v) };
    const raw = values?.[c.key];
    const pretty = meta.format(raw, it);
    const pct = Math.round((c.weight || 0) * 100);

    if (c.key === "price") return `Ανταγωνιστική τιμή (${pretty}) · βάρος ${pct}%`;
    if (c.key === "size") return `Καλό εμβαδόν (${pretty}) · βάρος ${pct}%`;
    if (c.key === "area_score") return `Καλή περιοχή (score ${pretty}) · βάρος ${pct}%`;
    if (c.key === "property_type") return `Τύπος ακινήτου: ${pretty} · βάρος ${pct}%`;
    return `${meta.label}: ${pretty} · βάρος ${pct}%`;
  });

  // fallback: if nothing stands out, still provide 2 generic bullets
  if (bullets.length === 0) {
    const meta = CRITERIA_META.price;
    const p = meta?.format(values?.price, it);
    return {
      title: `Γιατί είναι #${idx + 1}`,
      bullets: [
        "Συνδυασμός κριτηρίων βάσει βαρών (AHP).",
        p ? `Τιμή: ${p}` : "Επανέλεγξε τα βάρη σου για πιο καθαρή διαφοροποίηση.",
      ],
    };
  }

  const title = `Γιατί είναι #${idx + 1}`;
  return { title, bullets };
}

export default function RecommendationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [toast, setToast] = useState(null); // { severity, message }
  const [whatIf, setWhatIf] = useState(false);
  const [priceBoost, setPriceBoost] = useState(0.2);

  const HINTS_KEY = "rentpro_recommendations_hints_dismissed";
  const [showHints, setShowHints] = useState(() => {
    try {
      return localStorage.getItem(HINTS_KEY) !== "1";
    } catch {
      return true;
    }
  });

  // UI filters (client-side)
  const [filters, setFilters] = useState({
    area_id: "",
    type: "",
    price: [0, 5000],
    size: [0, 300],
  });

  const [areas, setAreas] = useState([]);
  const areaById = useMemo(() => {
    const m = new Map();
    for (const a of Array.isArray(areas) ? areas : []) {
      const id = Number(a?.id);
      if (!Number.isFinite(id)) continue;
      m.set(id, a);
    }
    return m;
  }, [areas]);

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

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get("/recommendations");
        if (!mounted) return;
        setData(res.data);
      } catch (e) {
        if (!mounted) return;
        const status = e?.response?.status;
        const payload = e?.response?.data;
        const detail = payload?.detail ?? payload ?? e.message ?? "Αποτυχία φόρτωσης προτάσεων.";
        setErr({ status, detail });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadAreas() {
      try {
        const res = await api.get("/areas/");
        if (!mounted) return;
        setAreas(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (mounted) setAreas([]);
      }
    }
    loadAreas();
    return () => {
      mounted = false;
    };
  }, []);

  // Derived values (must be defined before any early return; hooks must not be conditional)
  const items = useMemo(
    () => (Array.isArray(data?.items) ? data.items : []),
    [data]
  );
  const meta = useMemo(
    () => (data?.meta && typeof data.meta === "object" ? data.meta : {}),
    [data]
  );
  const ahp = items[0]?.explain?.ahp;
  const criteriaOrder = useMemo(
    () =>
      Array.isArray(meta.criteria_order)
        ? meta.criteria_order
        : ["price", "size", "property_type", "area_score"],
    [meta.criteria_order]
  );
  const criteriaOrderKey = useMemo(
    () => criteriaOrder.join("|"),
    [criteriaOrder]
  );
  const isBenefit = useMemo(
    () =>
      Array.isArray(meta.is_benefit)
        ? meta.is_benefit
        : [false, true, true, true],
    [meta.is_benefit]
  );

  const weightsBase = useMemo(
    () => normalizeWeightsFromDict(criteriaOrder, ahp?.weights || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [criteriaOrderKey, ahp?.weights]
  );
  const weightsActive = whatIf
    ? applyPriceBoost(criteriaOrder, weightsBase, priceBoost)
    : weightsBase;

  const decisionMatrix = useMemo(() => {
    const m = [];
    for (const it of items) {
      const v = it?.explain?.topsis?.criteria_values;
      if (!v) return null;
      const row = criteriaOrder.map((k) => Number(v?.[k] ?? NaN));
      if (row.some((x) => !Number.isFinite(x))) return null;
      m.push(row);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, criteriaOrderKey]);

  const whatIfRanking = useMemo(() => {
    if (!whatIf || !decisionMatrix) return null;
    const { scores, v, idealBest, idealWorst } = topsisCompute(
      decisionMatrix,
      weightsActive,
      isBenefit
    );
    const mapped = items.map((it, i) => ({
      it,
      score: scores[i]?.score ?? 0,
      vRow: v[i],
      idealBest,
      idealWorst,
    }));
    mapped.sort((a, b) => b.score - a.score);
    return mapped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatIf, decisionMatrix, weightsActive, isBenefit, items]);

  const rowsForDisplay = useMemo(() => {
    if (whatIfRanking) {
      return whatIfRanking.map((x) => ({
        it: x.it,
        score: Number(x.score ?? 0),
        vRow: x.vRow,
        idealBest: x.idealBest,
        idealWorst: x.idealWorst,
      }));
    }
    return items.map((it) => ({ it, score: Number(it?.score ?? 0) }));
  }, [whatIfRanking, items]);

  const filteredRows = useMemo(() => {
    const areaId = Number(filters.area_id || 0);
    const typeQ = String(filters.type || "").trim().toUpperCase();
    const [pMin, pMax] = Array.isArray(filters.price) ? filters.price : [0, 5000];
    const [sMin, sMax] = Array.isArray(filters.size) ? filters.size : [0, 300];

    return rowsForDisplay.filter((r) => {
      const p = r.it?.property;
      if (!p) return false;

      // type
      if (typeQ && String(p.type || "").toUpperCase() !== typeQ) return false;

      // price/size
      const price = Number(p.price);
      const size = Number(p.size);
      if (Number.isFinite(price) && (price < pMin || price > pMax)) return false;
      if (Number.isFinite(size) && (size < sMin || size > sMax)) return false;

      // area
      if (areaId > 0) return Number(p.area_id) === areaId;

      return true;
    });
  }, [rowsForDisplay, filters]);

  const baseExplain = useMemo(() => {
    if (!decisionMatrix) return null;
    const { v, idealBest, idealWorst } = topsisCompute(
      decisionMatrix,
      weightsBase,
      isBenefit
    );
    return { v, idealBest, idealWorst };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionMatrix, weightsBase, isBenefit]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={24} />
        <Typography>Φόρτωση προτάσεων…</Typography>
      </Box>
    );
  }

  if (err) {
    const detailObj =
      err?.detail && typeof err.detail === "object" && !Array.isArray(err.detail) ? err.detail : null;

    // Special UC-04 case (authoritative backend payload)
    if (err.status === 422 && detailObj?.error === "AHP_INCONSISTENT") {
      return (
        <PageContainer>
          <Alert severity="warning">
            <Typography variant="subtitle2">Αποτυχία ελέγχου συνέπειας AHP</Typography>

            <Typography variant="body2" sx={{ mt: 1 }}>
              {detailObj.message || "Οι συγκρίσεις δεν είναι συνεπείς. Παρακαλώ αναθεωρήστε."}
            </Typography>

            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                CR: <b>{detailObj.cr}</b>
              </Typography>
              <Typography variant="body2">
                Threshold: <b>{detailObj.threshold}</b>
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button component={RouterLink} to="/preferences" variant="contained">
                Πήγαινε στις Προτιμήσεις
              </Button>
              <Button component={RouterLink} to="/recommendations" variant="outlined">
                Δοκίμασε ξανά
              </Button>
            </Stack>
          </Alert>
        </PageContainer>
      );
    }

    // Other stage-separation cases
    if (err.status === 404 || err.status === 409 || err.status === 422) {
      return (
        <PageContainer>
          <Alert severity="warning">
            <Typography variant="subtitle2">Δεν είναι δυνατή η παραγωγή προτάσεων</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Κωδικός: {err.status}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
              {typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Πήγαινε στις <RouterLink to="/preferences">Προτιμήσεις</RouterLink> και ολοκλήρωσε τα βήματα της UC‑04.
            </Typography>
          </Alert>
        </PageContainer>
      );
    }

    return (
      <PageContainer>
        <Alert severity="error">
          {typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)}
        </Alert>
      </PageContainer>
    );
  }

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
        title="Προτάσεις"
        description="Κατάταξη (TOPSIS score) βάσει βαρών AHP."
      />

      <Paper sx={{ p: 3 }}>
        <Collapse in={showHints}>
          <Alert
            severity="info"
            icon={<InfoOutlinedIcon fontSize="inherit" />}
            sx={{ mb: 2 }}
            action={
              <IconButton
                size="small"
                aria-label="Κλείσιμο οδηγιών"
                onClick={() => {
                  setShowHints(false);
                  try {
                    localStorage.setItem(HINTS_KEY, "1");
                  } catch {
                    // ignore
                  }
                }}
              >
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
            }
          >
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Γρήγορος οδηγός
            </Typography>
            <Typography variant="body2">
              - Οι προτάσεις παράγονται από τις <b>Προτιμήσεις</b> σου (AHP) και την κατάταξη TOPSIS.
            </Typography>
            <Typography variant="body2">
              - Χρησιμοποίησε τα <b>Φίλτρα</b> για να περιορίσεις τη λίστα χωρίς να αλλάξεις τις προτιμήσεις σου.
            </Typography>
            <Typography variant="body2">
              - Το <b>What‑if</b> δείχνει πώς θα άλλαζε η κατάταξη αν δώσεις λίγο παραπάνω βάρος στην τιμή (μόνο στο UI).
            </Typography>
            <Typography variant="body2">
              - Αν θες διαφορετικά αποτελέσματα, γύρνα στις{" "}
              <RouterLink to="/preferences">Προτιμήσεις</RouterLink> και αναθεώρησε τα βάρη σου.
            </Typography>
          </Alert>
        </Collapse>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Φίλτρα προτάσεων</Typography>
            <Tooltip
              title="Φιλτράρεις τη λίστα προτάσεων που έχει ήδη υπολογιστεί. Δεν αλλάζεις τις προτιμήσεις σου."
              placement="right"
            >
              <IconButton size="small" aria-label="Βοήθεια φίλτρων">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="rec-area-label" shrink>
                  Περιοχή
                </InputLabel>
                <Select
                  labelId="rec-area-label"
                  label="Περιοχή"
                  value={filters.area_id}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, area_id: e.target.value }))
                  }
                  displayEmpty
                  renderValue={(v) => {
                    const id = Number(v || 0);
                    if (!id) return "Όλες οι περιοχές";
                    return areaById.get(id)?.name || `Area #${id}`;
                  }}
                >
                  <MenuItem value="">Όλες οι περιοχές</MenuItem>
                  {(Array.isArray(areas) ? areas : []).map((a) => (
                    <MenuItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="rec-type-label" shrink>
                  Τύπος
                </InputLabel>
                <Select
                  labelId="rec-type-label"
                  label="Τύπος"
                  value={filters.type}
                  onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                  displayEmpty
                  renderValue={(v) =>
                    PROPERTY_TYPE_OPTIONS.find((o) => o.value === String(v ?? ""))?.label ||
                    "Όλοι οι τύποι"
                  }
                >
                  {PROPERTY_TYPE_OPTIONS.map((o) => (
                    <MenuItem key={o.value || "<all>"} value={o.value} sx={{ whiteSpace: "normal" }}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Τιμή / μήνα
              </Typography>
              <Slider
                value={filters.price}
                min={0}
                max={5000}
                step={50}
                onChange={(_, v) => setFilters((f) => ({ ...f, price: v }))}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) =>
                  new Intl.NumberFormat("el-GR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(Number(v))
                }
                disableSwap
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Εμβαδόν (τ.μ.)
              </Typography>
              <Slider
                value={filters.size}
                min={0}
                max={300}
                step={5}
                onChange={(_, v) => setFilters((f) => ({ ...f, size: v }))}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} τ.μ.`}
                disableSwap
              />
            </Grid>

            <Grid item xs={12}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="flex-end"
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="outlined"
                  onClick={() =>
                    setFilters({
                      area_id: "",
                      type: "",
                      price: [0, 5000],
                      size: [0, 300],
                    })
                  }
                >
                  Επαναφορά φίλτρων
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle1" gutterBottom>
              Κατάταξη ακινήτων
            </Typography>

            {items.length === 0 ? (
              <Alert severity="info">
                Δεν υπάρχουν διαθέσιμα ακίνητα για συστάσεις.
              </Alert>
            ) : filteredRows.length === 0 ? (
              <Alert severity="info">
                Δεν υπάρχουν προτάσεις που να ταιριάζουν με τα φίλτρα σου.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {filteredRows.map((row, idx) => {
                  const it = row.it;
                  const valuesPresent = !!it?.explain?.topsis?.criteria_values;
                  const explainPack = whatIf
                    ? (() => {
                        if (!valuesPresent || !row.vRow) return null;
                        return explainTopBullets({
                          it,
                          idx,
                          criteriaOrder,
                          weights: weightsActive,
                          isBenefit,
                          vRow: row.vRow,
                          idealBest: row.idealBest,
                          idealWorst: row.idealWorst,
                        });
                      })()
                    : (() => {
                        if (!baseExplain || !valuesPresent) return null;
                        const i = items.indexOf(it);
                        if (i < 0) return null;
                        return explainTopBullets({
                          it,
                          idx,
                          criteriaOrder,
                          weights: weightsBase,
                          isBenefit,
                          vRow: baseExplain.v[i],
                          idealBest: baseExplain.idealBest,
                          idealWorst: baseExplain.idealWorst,
                        });
                      })();

                  return (
                    <Grid key={it.property?.id ?? idx} item xs={12} sm={6} md={4}>
                      <PropertyCard
                        property={it.property}
                        viewTo={`/search/properties/${it.property?.id}`}
                        rank={idx + 1} // NEW
                        score={Number(row.score)}
                        saved={savedIds.includes(Number(it.property?.id))}
                        inCompare={compareIds.includes(Number(it.property?.id))}
                        onToggleSave={toggleSaved}
                        onToggleCompare={toggleCompare}
                      />

                      {explainPack && explainPack.bullets ? (
                        <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            {explainPack.title}
                          </Typography>
                          <List dense sx={{ m: 0, p: 0 }}>
                            {explainPack.bullets.slice(0, 2).map((b, bi) => (
                              <ListItem key={bi} sx={{ py: 0.25 }}>
                                <ListItemText primaryTypographyProps={{ variant: "body2" }} primary={b} />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      ) : null}
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Grid>

          <Grid item xs={12} md={5}>
            <Typography variant="subtitle1" gutterBottom>
              Επεξήγηση (UC‑04)
            </Typography>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2">
                CR threshold: <b>{meta.cr_threshold}</b>
              </Typography>
              <Typography variant="body2">
                Available total: <b>{meta.available_properties_total}</b>
              </Typography>
              <Typography variant="body2">
                Ranked count: <b>{meta.ranked_properties_count}</b>
              </Typography>
              <Typography variant="body2">
                Missing area_score fallback: <b>{meta.missing_area_score_count}</b>
              </Typography>

              <Divider sx={{ my: 2 }} />

              {ahp ? (
                <>
                  <Typography variant="body2">
                    AHP CR: <b>{Number(ahp.cr).toFixed(6)}</b>
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                    Τα βάρη σου (AHP)
                  </Typography>

                  <Stack spacing={1}>
                    {criteriaOrder.map((k, i) => {
                      const metaC = CRITERIA_META[k] || { label: k };
                      const pct = Math.round((weightsActive[i] || 0) * 100);
                      const basePct = Math.round((weightsBase[i] || 0) * 100);
                      const showDelta = whatIf && pct !== basePct;
                      return (
                        <Box key={k}>
                          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                            <Typography variant="caption" color="text.secondary">
                              {metaC.label}
                            </Typography>
                            <Typography variant="caption">
                              <b>{pct}%</b>
                              {showDelta ? (
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {" "}
                                  (was {basePct}%)
                                </Typography>
                              ) : null}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{ height: 8, borderRadius: 1, mt: 0.5 }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2">What‑if (προαιρετικό)</Typography>
                    <Tooltip
                      title="Δοκιμαστική αλλαγή βαρών μόνο για να δεις πώς επηρεάζεται η κατάταξη. Δεν αποθηκεύεται."
                      placement="right"
                    >
                      <IconButton size="small" aria-label="Βοήθεια what-if">
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <FormControlLabel
                    control={<Switch checked={whatIf} onChange={(e) => setWhatIf(e.target.checked)} />}
                    label="Δώσε λίγο παραπάνω βάρος στην τιμή"
                  />
                  {whatIf ? (
                    <>
                      <Typography variant="caption" color="text.secondary">
                        Ενίσχυση τιμής: +{Math.round(priceBoost * 100)}% (κατάταξη στο UI)
                      </Typography>
                      <Slider
                        value={priceBoost}
                        min={0}
                        max={0.6}
                        step={0.05}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `+${Math.round(v * 100)}%`}
                        onChange={(_, v) => setPriceBoost(Number(v))}
                        sx={{ mt: 1 }}
                      />
                      {!decisionMatrix ? (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Το what‑if απαιτεί επιπλέον explainability δεδομένα από το API.
                        </Alert>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <Alert severity="info">No explainability data available.</Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>

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
    </PageContainer>
  );
}