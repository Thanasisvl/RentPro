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
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
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

  const items = data?.items || [];
  const meta = data?.meta || {};
  const ahp = items[0]?.explain?.ahp;
  const criteriaOrder = Array.isArray(meta.criteria_order)
    ? meta.criteria_order
    : ["price", "size", "property_type", "area_score"];
  const isBenefit = Array.isArray(meta.is_benefit) ? meta.is_benefit : [false, true, true, true];
  const weightsBase = useMemo(
    () => normalizeWeightsFromDict(criteriaOrder, ahp?.weights || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [criteriaOrder.join("|"), ahp?.weights]
  );
  const weightsActive = whatIf ? applyPriceBoost(criteriaOrder, weightsBase, priceBoost) : weightsBase;

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
  }, [items, criteriaOrder.join("|")]);

  const whatIfRanking = useMemo(() => {
    if (!whatIf || !decisionMatrix) return null;
    const { scores, v, idealBest, idealWorst } = topsisCompute(decisionMatrix, weightsActive, isBenefit);
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

  const baseExplain = useMemo(() => {
    if (!decisionMatrix) return null;
    const { v, idealBest, idealWorst } = topsisCompute(decisionMatrix, weightsBase, isBenefit);
    return { v, idealBest, idealWorst };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionMatrix, weightsBase, isBenefit]);

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
            ) : (
              <Grid container spacing={2}>
                {(whatIfRanking ? whatIfRanking.map((x) => x.it) : items).map((it, idx) => {
                  const valuesPresent = !!it?.explain?.topsis?.criteria_values;
                  const explainPack = whatIf
                    ? (() => {
                        if (!whatIfRanking || !valuesPresent) return null;
                        const match = whatIfRanking.find((x) => x.it === it);
                        if (!match) return null;
                        return explainTopBullets({
                          it,
                          idx,
                          criteriaOrder,
                          weights: weightsActive,
                          isBenefit,
                          vRow: match.vRow,
                          idealBest: match.idealBest,
                          idealWorst: match.idealWorst,
                        });
                      })()
                    : (() => {
                        if (!baseExplain || !valuesPresent) return null;
                        const i = items.indexOf(it);
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
                    <Grid key={it.property?.id ?? idx} item xs={12} sm={6}>
                      <PropertyCard
                        property={it.property}
                        viewTo={`/search/properties/${it.property?.id}`}
                        rank={idx + 1} // NEW
                        score={
                          whatIf && whatIfRanking
                            ? Number(whatIfRanking[idx]?.score ?? it.score)
                            : Number(it.score)
                        }
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

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    What‑if (προαιρετικό)
                  </Typography>
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