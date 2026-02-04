import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api, { getUserRole } from "../api";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = getUserRole() === "ADMIN";
  const [ownerId, setOwnerId] = useState("");

  const fetchTenants = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (isAdmin && ownerId) params.owner_id = Number(ownerId);

      const res = await api.get("/tenants", { params });
      setTenants(res.data || []);
    } catch (err) {
      console.error("Failed to load tenants", err);
      if (err.response && err.response.status === 401) {
        setError("Η συνεδρία έληξε. Κάνε ξανά login.");
      } else {
        setError("Αποτυχία φόρτωσης ενοικιαστών.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Ενοικιαστές"
        description="Καταχώριση και προβολή ενοικιαστών (UC‑05)."
        actions={
          <Button variant="contained" component={RouterLink} to="/tenants/new">
            Νέος Ενοικιαστής
          </Button>
        }
      />

      <Paper sx={{ p: 3 }}>

        {isAdmin && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <TextField
                label="Owner ID (admin)"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <Button variant="outlined" onClick={fetchTenants}>
                Αναζήτηση
              </Button>
            </Stack>
          </Paper>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!error && (
          <List>
            {tenants.map((t) => (
              <ListItem key={t.id} divider>
                <ListItemText
                  primary={t.name || `Tenant #${t.id}`}
                  secondary={`${t.afm}${t.email ? ` • ${t.email}` : ""}${t.phone ? ` • ${t.phone}` : ""}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </PageContainer>
  );
}

export default TenantList;