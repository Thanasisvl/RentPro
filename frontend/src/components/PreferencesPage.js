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
  Tooltip,
  IconButton,
  Switch,
  LinearProgress,
} from "@mui/material";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { useNavigate } from "react-router-dom";
import api from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

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

function SaatyHelpContent() {
  return (
    <Box sx={{ p: 1, maxWidth: 340 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Saaty scale (1–9)
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Χρησιμοποίησε ακέραιες τιμές. Η φορά (A&gt;B ή B&gt;A) δηλώνει ποιος υπερισχύει.
      </Typography>
      <Stack spacing={0.25}>
        <Typography variant="caption">1 = ίση σημασία</Typography>
        <Typography variant="caption">3 = μέτρια προτίμηση</Typography>
        <Typography variant="caption">5 = ισχυρή προτίμηση</Typography>
        <Typography variant="caption">7 = πολύ ισχυρή προτίμηση</Typography>
        <Typography variant="caption">9 = ακραία προτίμηση</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Tip: Αν δυσκολεύεσαι, ξεκίνα με 1/3/5 και “fine‑tune” μετά.
      </Typography>
    </Box>
  );
}

function analyzeContradictions(criteriaKeys, comparisons) {
  // Returns top contradictions based on triad inconsistency:
  // For triad (i,j,k): consistency expects a[i][k] ≈ a[i][j] * a[j][k]
  // Score uses log-distance to be scale-invariant.
  const a = buildMatrix(criteriaKeys, comparisons);
  const n = a.length;
  if (n < 3) return [];

  const conflicts = [];
  const safeLog = (x) => Math.log(Math.max(1e-12, Number(x)));
  const abs = Math.abs;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const aij = a[i][j];
        const ajk = a[j][k];
        const aik = a[i][k];
        // triad score
        const triadScore = abs(safeLog((aij * ajk) / aik));

        // attribute to the "most-off" edge in this triad
        const eIk = abs(safeLog(aik / (aij * ajk)));
        const eIj = abs(safeLog(aij / (aik / ajk)));
        const eJk = abs(safeLog(ajk / (aik / aij)));
        let suggest = [criteriaKeys[i], criteriaKeys[k]];
        let edgeScore = eIk;
        if (eIj >= edgeScore) {
          edgeScore = eIj;
          suggest = [criteriaKeys[i], criteriaKeys[j]];
        }
        if (eJk >= edgeScore) {
          edgeScore = eJk;
          suggest = [criteriaKeys[j], criteriaKeys[k]];
        }

        conflicts.push({
          score: triadScore,
          triad: [criteriaKeys[i], criteriaKeys[j], criteriaKeys[k]],
          suggestPair: suggest,
        });
      }
    }
  }

  conflicts.sort((x, y) => y.score - x.score);
  return conflicts.slice(0, 2);
}

export default function PreferencesPage() {
  const navigate = useNavigate();

  const criteriaByKey = useMemo(() => new Map(CRITERIA.map((c) => [c.key, c])), []);
  const keys = useMemo(() => CRITERIA.map((c) => c.key), []);
  const pairs = useMemo(() => buildPairs(keys), [keys]);
  const pairIndexByKey = useMemo(() => {
    const m = new Map();
    pairs.forEach(([a, b], idx) => m.set(`${a}__${b}`, idx));
    return m;
  }, [pairs]);

  const [tab, setTab] = useState(0);
  const [profileName, setProfileName] = useState("UC-04 Profile");
  const [savingProfile, setSavingProfile] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

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

  const comparisonsForAnalysis = useMemo(() => {
    try {
      if (tab !== 0) return null;
      if (!inputsComplete) return null;
      return buildComparisonsFromUI();
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, inputsComplete, pairwise]);

  const contradictions = useMemo(() => {
    if (tab !== 0) return [];
    if (crPreview == null || crOk) return [];
    if (!comparisonsForAnalysis) return [];
    return analyzeContradictions(keys, comparisonsForAnalysis);
  }, [tab, crPreview, crOk, comparisonsForAnalysis, keys]);

  function resetPairwiseToEqual() {
    const next = {};
    pairs.forEach(([a, b]) => {
      next[`${a}__${b}`] = { direction: "A_OVER_B", intensity: 1 };
    });
    setPairwise(next);
    setWizardStep(0);
  }

  async function saveProfile() {
    setError(null);
    setSavingProfile(true);
    try {
      await api.put("/preference-profiles/me", { name: profileName.trim() });
    } catch (e) {
      const payload = e?.response?.data;
      setError(
        payload?.message ||
          payload?.detail ||
          payload ||
          e.message ||
          "Αποτυχία αποθήκευσης προφίλ."
      );
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
      setError(
        payload?.message ||
          payload?.detail ||
          payload ||
          e.message ||
          "Αποτυχία υποβολής προτιμήσεων."
      );
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

  const jumpToPair = (aKey, bKey) => {
    const k = `${aKey}__${bKey}`;
    const idx = pairIndexByKey.get(k);
    if (typeof idx === "number") {
      setWizard(true);
      setWizardStep(idx);
      // gentle nudge to that section
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Προτιμήσεις"
        description="Ορισμός προτιμήσεων (AHP) πριν την παραγωγή προτάσεων (TOPSIS)."
      />

      <Paper sx={{ p: 3 }}>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary">
            Ζωντανή προεπισκόπηση:
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
            Το όνομα προφίλ είναι υποχρεωτικό.
          </Alert>
        )}

        {!inputsComplete && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Συμπλήρωσε όλα τα πεδία πριν την υποβολή.
          </Alert>
        )}

        {!crOk && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Το CR είναι πάνω από {CR_THRESHOLD.toFixed(2)}. Αναθεώρησε συγκρίσεις για να γίνει η υποβολή.
          </Alert>
        )}

        {tab === 0 && !crOk && contradictions.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Γιατί αποτυγχάνει το CR;
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Συνήθως υπάρχει “αντίφαση” σε τριάδες συγκρίσεων. Παρακάτω είναι οι 2 μεγαλύτερες
              συγκρούσεις και ένα προτεινόμενο επόμενο βήμα.
            </Typography>

            <Stack spacing={1}>
              {contradictions.map((c, idx) => {
                const [t1, t2, t3] = c.triad;
                const [sa, sb] = c.suggestPair;
                const triadLabel = `${criteriaByKey.get(t1)?.label || t1} ↔ ${
                  criteriaByKey.get(t2)?.label || t2
                } ↔ ${criteriaByKey.get(t3)?.label || t3}`;
                const suggestLabel = `${criteriaByKey.get(sa)?.label || sa} vs ${
                  criteriaByKey.get(sb)?.label || sb
                }`;
                return (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2">
                      <b>Conflict #{idx + 1}:</b> {triadLabel}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Πρόταση: Ξαναδές <b>{suggestLabel}</b>.
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => jumpToPair(sa, sb)}
                      >
                        Πήγαινε στο pair
                      </Button>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Paper>
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
                  label="Όνομα προφίλ"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                error={!profileNameOk}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="outlined" onClick={saveProfile} disabled={savingProfile || !profileNameOk}>
                  Αποθήκευση προφίλ
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="AHP (Ζεύγη)" />
          <Tab label="Γρήγορα βάρη (Sliders → ζεύγη)" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ mt: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center">
              <Button variant="outlined" onClick={resetPairwiseToEqual}>
                Επαναφορά (όλα = 1)
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={wizard}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setWizard(on);
                      setWizardStep(0);
                    }}
                  />
                }
                label="Wizard mode"
              />
              <Tooltip title={<SaatyHelpContent />} placement="top" arrow>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<HelpOutlineOutlinedIcon />}
                >
                  Βοήθεια κλίμακας Saaty
                </Button>
              </Tooltip>
            </Stack>

            {wizard && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Βήμα <b>{wizardStep + 1}</b> / <b>{pairs.length}</b>
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={((wizardStep + 1) / Math.max(1, pairs.length)) * 100}
                  sx={{ mt: 1 }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                    disabled={wizardStep <= 0}
                  >
                    Πίσω
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setWizardStep((s) => Math.min(pairs.length - 1, s + 1))}
                    disabled={wizardStep >= pairs.length - 1}
                  >
                    Επόμενο
                  </Button>
                </Stack>
              </Paper>
            )}

            {(wizard ? [pairs[wizardStep]] : pairs).map(([a, b]) => {
              const key = `${a}__${b}`;
              const st = pairwise[key] || { direction: "A_OVER_B", intensity: 1 };
              const aLabel = criteriaByKey.get(a)?.label || a;
              const bLabel = criteriaByKey.get(b)?.label || b;

              return (
                <Paper key={key} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Σύγκριση: <b>{aLabel}</b> vs <b>{bLabel}</b>
                  </Typography>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                      <FormControl>
                        <FormLabel>Ποιο είναι σημαντικότερο;</FormLabel>
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
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            Ένταση (1 = ίσο, 9 = ακραίο)
                        </Typography>
                        <Tooltip title={<SaatyHelpContent />} placement="top" arrow>
                          <IconButton size="small" aria-label="Βοήθεια κλίμακας Saaty">
                            <HelpOutlineOutlinedIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Slider
                        value={Number(st.intensity)}
                        min={1}
                        max={9}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                        onChange={(_, v) => setPairwise((prev) => ({ ...prev, [key]: { ...prev[key], intensity: v } }))}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Προτιμάται το {st.direction === "A_OVER_B" ? aLabel : bLabel} με ένταση{" "}
                        <b>{Number(st.intensity)}</b>.
                      </Typography>
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
          Υποβολή προτιμήσεων
        </Button>
      </Paper>
    </PageContainer>
  );
}