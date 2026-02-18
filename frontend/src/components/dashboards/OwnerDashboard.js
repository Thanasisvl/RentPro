import React from "react";
import { Alert, Button, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import PageContainer from "../layout/PageContainer";
import PageHeader from "../layout/PageHeader";
import StatCard from "./StatCard";

function OwnerDashboard() {
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
        title="Ο πίνακας σου"
        description="Διαχείριση ακινήτων, ενοικιαστών και συμβολαίων."
      />

      {stats.error ? (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          {stats.error}
        </Alert>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Ακίνητα"
            value={stats.properties}
            subtitle="Σύνολο καταχωρημένων ακινήτων"
            loading={stats.loading}
            actions={
              <>
                <Button variant="contained" onClick={() => navigate("/properties")}>
                  Άνοιξε
                </Button>
                <Button variant="outlined" onClick={() => navigate("/properties/new")}>
                  Νέο
                </Button>
              </>
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Ενοικιαστές"
            value={stats.tenants}
            subtitle="Σύνολο ενοικιαστών"
            loading={stats.loading}
            actions={
              <>
                <Button variant="contained" onClick={() => navigate("/tenants")}>
                  Άνοιξε
                </Button>
                <Button variant="outlined" onClick={() => navigate("/tenants/new")}>
                  Νέος
                </Button>
              </>
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Συμβόλαια"
            value={stats.contracts}
            subtitle="Σύνολο συμβολαίων"
            loading={stats.loading}
            actions={
              <>
                <Button variant="contained" onClick={() => navigate("/contracts")}>
                  Άνοιξε
                </Button>
                <Button variant="outlined" onClick={() => navigate("/contracts/new")}>
                  Νέο
                </Button>
              </>
            }
          />
        </Grid>
      </Grid>

      {/* Stat cards above act as the owner dashboard */}
    </PageContainer>
  );
}

export default OwnerDashboard;

