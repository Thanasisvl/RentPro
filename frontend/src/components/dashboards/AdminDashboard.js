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
    users: 0,
    properties: 0,
    tenants: 0,
    contracts: 0,
    areas: 0,
  });

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [uRes, pRes, tRes, cRes, aRes] = await Promise.all([
          api.get("/users/"),
          api.get("/properties/"),
          api.get("/tenants"),
          api.get("/contracts/"),
          api.get("/areas/"),
        ]);
        if (!mounted) return;
        setStats({
          loading: false,
          error: "",
          users: Array.isArray(uRes.data) ? uRes.data.length : 0,
          properties: Array.isArray(pRes.data) ? pRes.data.length : 0,
          tenants: Array.isArray(tRes.data) ? tRes.data.length : 0,
          contracts: Array.isArray(cRes.data) ? cRes.data.length : 0,
          areas: Array.isArray(aRes.data) ? aRes.data.length : 0,
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

  const cardPaperSx = {
    p: 2.5,
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid",
    borderColor: "divider",
  };

  return (
    <PageContainer>
      <PageHeader
        title="Ο πίνακας σου"
        description="Εποπτεία και διαχείριση χρηστών, ακινήτων και περιοχών."
      />

      {stats.error ? (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          {stats.error}
        </Alert>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Χρήστες (όλοι)"
            value={stats.users}
            subtitle="Σύνολο χρηστών"
            loading={stats.loading}
            actions={
              <Button variant="contained" onClick={() => navigate("/app/admin/users")}>
                Άνοιξε
              </Button>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Περιοχές (Areas)"
            value={stats.areas}
            subtitle="Λεξικό περιοχών"
            loading={stats.loading}
            actions={
              <Button variant="contained" onClick={() => navigate("/app/admin/areas")}>
                Άνοιξε
              </Button>
            }
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={cardPaperSx}>
        <Typography variant="body2" color="text.secondary">
          Χρησιμοποίησε τις ενότητες παραπάνω για διαχείριση χρηστών, ακινήτων και περιοχών.
        </Typography>
      </Paper>
    </PageContainer>
  );
}

export default AdminDashboard;

