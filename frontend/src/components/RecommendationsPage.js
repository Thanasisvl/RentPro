import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  Button,
  Stack,
} from "@mui/material";
import api from "../api";
import { Link as RouterLink } from "react-router-dom";

export default function RecommendationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

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
        const detail = payload?.detail ?? payload ?? e.message ?? "Failed to load recommendations";
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
        <Typography>Loading recommendations…</Typography>
      </Box>
    );
  }

  if (err) {
    const detailObj =
      err?.detail && typeof err.detail === "object" && !Array.isArray(err.detail) ? err.detail : null;

    // Special UC-04 case (authoritative backend payload)
    if (err.status === 422 && detailObj?.error === "AHP_INCONSISTENT") {
      return (
        <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
          <Alert severity="warning">
            <Typography variant="subtitle2">AHP Consistency Check Failed</Typography>

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
                Go to Preferences
              </Button>
              <Button component={RouterLink} to="/recommendations" variant="outlined">
                Retry
              </Button>
            </Stack>
          </Alert>
        </Box>
      );
    }

    // Other stage-separation cases
    if (err.status === 404 || err.status === 409 || err.status === 422) {
      return (
        <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
          <Alert severity="warning">
            <Typography variant="subtitle2">Cannot produce recommendations</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Status: {err.status}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
              {typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Go to <RouterLink to="/preferences">Preferences</RouterLink> and complete UC-04 steps.
            </Typography>
          </Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
        <Alert severity="error">
          {typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)}
        </Alert>
      </Box>
    );
  }

  const items = data?.items || [];
  const meta = data?.meta || {};
  const ahp = items[0]?.explain?.ahp;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Recommendations
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Ranked list (TOPSIS closeness score) based on AHP weights.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle1" gutterBottom>
              Ranked properties
            </Typography>

            {items.length === 0 ? (
              <Alert severity="info">No available properties to recommend.</Alert>
            ) : (
              <List>
                {items.map((it, idx) => (
                  <React.Fragment key={it.property?.id ?? idx}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={`${idx + 1}. ${it.property?.title ?? "Property"} — score: ${Number(it.score).toFixed(4)}`}
                        secondary={
                          <>
                            <div>Type: {it.property?.type}</div>
                            <div>Address: {it.property?.address}</div>
                            <div>
                              Price: {it.property?.price} | Size: {it.property?.size}
                            </div>
                          </>
                        }
                      />
                    </ListItem>
                    {idx < items.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Grid>

          <Grid item xs={12} md={5}>
            <Typography variant="subtitle1" gutterBottom>
              Explainability (UC-04)
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
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Weights:
                  </Typography>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(ahp.weights, null, 2)}
                  </pre>
                </>
              ) : (
                <Alert severity="info">No explainability data available.</Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}