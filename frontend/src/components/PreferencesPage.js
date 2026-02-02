import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Divider,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api";

const CR_THRESHOLD = 0.10;

const CRITERIA = [
  { key: "price", label: "Price (€/month)" },
  { key: "size", label: "Size (sqm)" },
  { key: "property_type", label: "Property type (ordinal)" },
  { key: "area_score", label: "Area score" },
];

const RI = { 1: 0.0, 2: 0.0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };

function buildPairs(keys) {
  const pairs = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) pairs.push([keys[i], keys[j]]);
  return pairs;
}

function clampSaaty(v) {
  const min = 1 / 9;
  const max = 9;
  return Math.max(min, Math.min(max, v));
}

function buildMatrix(criteriaKeys, comparisons) {
  const n = criteriaKeys.length;
  const idx = new Map(criteriaKeys.map((k, i) => [k, i]));
  const a = Array.from({ length: n }, () => Array.from({ length: n }, () => 1));

  comparisons.forEach(({ criterion_a_key, criterion_b_key, value }) => {
    const i = idx.get(criterion_a_key);
    const j = idx.get(criterion_b_key);
    if (i == null || j == null) return;
    const v = Number(value);
    a[i][j] = v;
    a[j][i] = 1 / v;
  });

  return a;
}

function geometricMeanWeights(a) {
  const n = a.length;
  const gms = a.map((row) => {
    let logSum = 0;
    for (let j = 0; j < n; j++) logSum += Math.log(row[j]);
    return Math.exp(logSum / n);
  });
  const s = gms.reduce((acc, x) => acc + x, 0);
  return gms.map((x) => x / s);
}

function lambdaMax(a, w) {
  const n = a.length;
  const aw = Array.from({ length: n }, (_, i) => a[i].reduce((acc, aij, j) => acc + aij * w[j], 0));
  const lambdas = aw.map((x, i) => x / w[i]);
  return lambdas.reduce((acc, x) => acc + x, 0) / n;
}

function computeCR(criteriaKeys, comparisons) {
  const n = criteriaKeys.length;
  const a = buildMatrix(criteriaKeys, comparisons);
  const w = geometricMeanWeights(a);
  const lam = lambdaMax(a, w);

  const ci = n <= 2 ? 0 : (lam - n) / (n - 1);
  const ri = RI[n] ?? 0;
  const cr = ri === 0 ? 0 : ci / ri;
  return cr;
}

export default function PreferencesPage() {
  const navigate = useNavigate();

  const criteriaByKey = useMemo(() => new Map(CRITERIA.map((c) => [c.key, c])), []);
  const keys = useMemo(() => CRITERIA.map((c) => c.key), []);
  const pairs = useMemo(() => buildPairs(keys), [keys]);

  const [tab, setTab] = useState(0);
  const [profileName, setProfileName] = useState("UC-04 Profile");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pairwise, setPairwise] = useState(() => {
    const init = {};
    pairs.forEach(([a, b]) => (init[`${a}__${b}`] = { direction: "A_OVER_B", intensity: 1 }));
    return init;
  });

  const [weights, setWeights] = useState({ price: 5, size: 5, property_type: 5, area_score: 5 });

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [crPreview, setCrPreview] = useState(null);

  const profileNameOk = profileName.trim().length > 0;

  function buildComparisonsFromUI() {
    if (tab === 0) {
      return pairs.map(([a, b]) => {
        const st = pairwise[`${a}__${b}`] || {};
        const intensity = clampSaaty(Number(st.intensity || 1));
        const value = st.direction === "B_OVER_A" ? clampSaaty(1 / intensity) : intensity;
        return { criterion_a_key: a, criterion_b_key: b, value };
      });
    }

    // tab === 1: sliders -> consistent matrix
    return pairs.map(([a, b]) => {
      const wa = Number(weights[a] ?? 1);
      const wb = Number(weights[b] ?? 1);
      return { criterion_a_key: a, criterion_b_key: b, value: clampSaaty(wa / wb) };
    });
  }

  function isPairwiseComplete() {
    // must have direction + intensity for every pair
    return pairs.every(([a, b]) => {
      const st = pairwise[`${a}__${b}`];
      if (!st) return false;
      if (st.direction !== "A_OVER_B" && st.direction !== "B_OVER_A") return false;
      const intensity = Number(st.intensity);
      return Number.isFinite(intensity) && intensity >= 1 && intensity <= 9;
    });
  }

  function isWeightsComplete() {
    return keys.every((k) => {
      const v = Number(weights[k]);
      return Number.isFinite(v) && v >= 1 && v <= 9;
    });
  }

  const inputsComplete = tab === 0 ? isPairwiseComplete() : isWeightsComplete();

  // live CR preview (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (!inputsComplete) {
          setCrPreview(null);
          return;
        }
        const comparisons = buildComparisonsFromUI();
        const cr = computeCR(keys, comparisons);
        setCrPreview(cr);
      } catch {
        setCrPreview(null);
      }
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pairwise, weights, inputsComplete]);

  const crOk = crPreview == null ? true : crPreview < CR_THRESHOLD;

  const canSubmit = profileNameOk && inputsComplete && crOk && !submitting;

  function resetPairwiseToEqual() {
    const next = {};
    pairs.forEach(([a, b]) => {
      next[`${a}__${b}`] = { direction: "A_OVER_B", intensity: 1 };
    });
    setPairwise(next);
  }

  async function saveProfile() {
    setError(null);
    setSavingProfile(true);
    try {
      await api.put("/preference-profiles/me", { name: profileName.trim() });
    } catch (e) {
      const payload = e?.response?.data;
      setError(payload?.message || payload?.detail || payload || e.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPairwiseComparisons(comparisons) {
    setError(null);
    setSubmitting(true);
    try {
      await api.put("/preference-profiles/me", { name: profileName.trim() });
      await api.post("/preference-profiles/me/pairwise-comparisons", { comparisons });
      navigate("/recommendations");
    } catch (e) {
      // backend authoritative (esp. 422 AHP_INCONSISTENT)
      const payload = e?.response?.data;
      setError(payload?.message || payload?.detail || payload || e.message || "Failed to submit comparisons");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (!profileNameOk) {
      setError("Profile name is required.");
      return;
    }
    if (!inputsComplete) {
      setError("Please complete all comparison inputs before submitting.");
      return;
    }
    submitPairwiseComparisons(buildComparisonsFromUI());
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          UC-04 Preferences (AHP → TOPSIS)
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary">
            Live preview:
          </Typography>

          {crPreview == null ? (
            <Chip label="CR: —" size="small" variant="outlined" />
          ) : crOk ? (
            <Chip label={`CR: ${crPreview.toFixed(3)} (OK)`} size="small" color="success" />
          ) : (
            <Chip label={`CR: ${crPreview.toFixed(3)} (Needs review)`} size="small" color="warning" />
          )}

          <Typography variant="caption" color="text.secondary">
            Threshold: {CR_THRESHOLD.toFixed(2)} (backend authoritative)
          </Typography>
        </Box>

        {!profileNameOk && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Profile name is required.
          </Alert>
        )}

        {!inputsComplete && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Complete all inputs before submitting.
          </Alert>
        )}

        {!crOk && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            CR is above {CR_THRESHOLD.toFixed(2)}. Please revise comparisons to enable submission.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {typeof error === "string" ? error : JSON.stringify(error)}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Profile name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                error={!profileNameOk}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="outlined" onClick={saveProfile} disabled={savingProfile || !profileNameOk}>
                Save Profile
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="AHP (Pairwise)" />
          <Tab label="Quick weights (Sliders → pairwise)" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ mt: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
              <Button variant="outlined" onClick={resetPairwiseToEqual}>
                Reset to equal (all 1)
              </Button>
            </Stack>

            {pairs.map(([a, b]) => {
              const key = `${a}__${b}`;
              const st = pairwise[key] || { direction: "A_OVER_B", intensity: 1 };
              const aLabel = criteriaByKey.get(a)?.label || a;
              const bLabel = criteriaByKey.get(b)?.label || b;

              return (
                <Paper key={key} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Compare: <b>{aLabel}</b> vs <b>{bLabel}</b>
                  </Typography>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                      <FormControl>
                        <FormLabel>Which is more important?</FormLabel>
                        <RadioGroup
                          row
                          value={st.direction}
                          onChange={(e) => setPairwise((prev) => ({ ...prev, [key]: { ...prev[key], direction: e.target.value } }))}
                        >
                          <FormControlLabel value="A_OVER_B" control={<Radio />} label={aLabel} />
                          <FormControlLabel value="B_OVER_A" control={<Radio />} label={bLabel} />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={7}>
                      <Typography variant="caption" color="text.secondary">
                        Intensity (1 = equal, 9 = extreme)
                      </Typography>
                      <Slider
                        value={Number(st.intensity)}
                        min={1}
                        max={9}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                        onChange={(_, v) => setPairwise((prev) => ({ ...prev, [key]: { ...prev[key], intensity: v } }))}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ mt: 2 }}>
            {CRITERIA.map((c) => (
              <Paper key={c.key} variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {c.label}
                </Typography>
                <Slider
                  value={Number(weights[c.key] ?? 1)}
                  min={1}
                  max={9}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  onChange={(_, v) => setWeights((prev) => ({ ...prev, [c.key]: v }))}
                />
              </Paper>
            ))}
          </Box>
        )}

        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          Submit Comparisons
        </Button>
      </Paper>
    </Box>
  );
}