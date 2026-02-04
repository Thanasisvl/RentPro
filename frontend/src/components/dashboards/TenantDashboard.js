import React from "react";
import { Alert, Button, Grid, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import PageContainer from "../layout/PageContainer";
import PageHeader from "../layout/PageHeader";
import StatCard from "./StatCard";

function TenantDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    loading: true,
    error: "",
    saved: 0,
    compare: 0,
    ranked: null, // number | null
    rankedHint: "",
  });

  const SAVED_KEY = "rentpro_saved_properties";
  const COMPARE_KEY = "rentpro_compare_properties";

  const readIds = React.useCallback((key) => {
    try {
      const raw = localStorage.getItem(key);
      const arr = JSON.parse(raw || "[]");
      if (!Array.isArray(arr)) return [];
      return arr.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    } catch {
      return [];
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      const saved = readIds(SAVED_KEY).length;
      const compare = readIds(COMPARE_KEY).length;

      try {
        const res = await api.get("/recommendations");
        if (!mounted) return;
        const meta = res.data?.meta || {};
        const ranked = Number(meta.ranked_properties_count);
        setStats({
          loading: false,
          error: "",
          saved,
          compare,
          ranked: Number.isFinite(ranked) ? ranked : 0,
          rankedHint: "",
        });
      } catch (e) {
        if (!mounted) return;
        const status = e?.response?.status;
        const detail = e?.response?.data?.detail;
        const isAhp =
          status === 422 && detail && typeof detail === "object" && detail.error === "AHP_INCONSISTENT";
        setStats({
          loading: false,
          error: "",
          saved,
          compare,
          ranked: null,
          rankedHint: isAhp
            ? "Χρειάζεται αναθεώρηση προτιμήσεων (AHP συνέπεια)."
            : "Δεν είναι διαθέσιμες ακόμα.",
        });
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [readIds]);

  return (
    <PageContainer>
      <PageHeader
        title="Πίνακας (Ενοικιαστής)"
        description="Γρήγορες ενέργειες για αναζήτηση και προτάσεις (UC‑03 / UC‑04)."
      />

      {stats.error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {stats.error}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Αποθηκευμένα"
            value={stats.saved}
            subtitle="Αποθηκευμένα ακίνητα"
            loading={stats.loading}
            actions={
              <Button variant="contained" onClick={() => navigate("/search")}>
                Αναζήτηση
              </Button>
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <StatCard
            title="Σύγκριση"
            value={stats.compare}
            subtitle="Προς σύγκριση (max 3)"
            loading={stats.loading}
            actions={
              <Button variant="contained" onClick={() => navigate("/search")}>
                Άνοιξε αναζήτηση
              </Button>
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <StatCard
            title="Προτάσεις"
            value={stats.ranked == null ? "—" : stats.ranked}
            subtitle={stats.rankedHint || "Διαθέσιμα προτεινόμενα ακίνητα"}
            loading={stats.loading}
            actions={
              <>
                <Button variant="contained" onClick={() => navigate("/recommendations")}>
                  Προτάσεις
                </Button>
                <Button variant="outlined" onClick={() => navigate("/preferences")}>
                  Προτιμήσεις
                </Button>
              </>
            }
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Tip: Αν δεν βγαίνουν προτάσεις, ξεκίνα από τις Προτιμήσεις (AHP) και έλεγξε τη συνέπεια (CR).
        </Typography>
      </Paper>
    </PageContainer>
  );
}

export default TenantDashboard;

