import React from "react";
import { Alert, Button, Grid, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import PageContainer from "../layout/PageContainer";
import PageHeader from "../layout/PageHeader";
import StatCard from "./StatCard";

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    loading: true,
    error: "",
    properties: 0,
    tenants: 0,
    contracts: 0,
  });

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [pRes, tRes, cRes] = await Promise.all([
          api.get("/properties/"),
          api.get("/tenants"),
          api.get("/contracts/"),
        ]);
        if (!mounted) return;
        setStats({
          loading: false,
          error: "",
          properties: Array.isArray(pRes.data) ? pRes.data.length : 0,
          tenants: Array.isArray(tRes.data) ? tRes.data.length : 0,
          contracts: Array.isArray(cRes.data) ? cRes.data.length : 0,
        });
      } catch (e) {
        if (!mounted) return;
        setStats((s) => ({
          ...s,
          loading: false,
          error: "Δεν ήταν δυνατή η φόρτωση των στατιστικών.",
        }));
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Πίνακας (Διαχειριστής)"
        description="Εποπτεία / διαχείριση (FR‑20 / FR‑21) — θα ολοκληρωθεί σε επόμενο βήμα."
      />

      {stats.error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {stats.error}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Ακίνητα (όλα)"
            value={stats.properties}
            subtitle="Σύνολο ακινήτων"
            loading={stats.loading}
            actions={
              <Button variant="contained" onClick={() => navigate("/properties")}>
                Άνοιξε
              </Button>
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Ενοικιαστές (όλοι)"
            value={stats.tenants}
            subtitle="Σύνολο ενοικιαστών"
            loading={stats.loading}
            actions={
              <Button variant="contained" onClick={() => navigate("/tenants")}>
                Άνοιξε
              </Button>
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Συμβόλαια (όλα)"
            value={stats.contracts}
            subtitle="Σύνολο συμβολαίων"
            loading={stats.loading}
            actions={
              <Button variant="contained" onClick={() => navigate("/contracts")}>
                Άνοιξε
              </Button>
            }
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Το πλήρες admin panel (FR‑20/FR‑21: monitoring/oversight) θα προστεθεί αργότερα. Προς το
          παρόν, χρησιμοποίησε τις ενότητες διαχείρισης παραπάνω.
        </Typography>
      </Paper>
    </PageContainer>
  );
}

export default AdminDashboard;

