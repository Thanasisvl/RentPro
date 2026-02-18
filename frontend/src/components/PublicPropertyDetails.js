import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Stack,
  Grid,
  Chip,
  Divider,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";
import SiteFooter from "./layout/SiteFooter";
import {
  getPropertyPhotoUrl,
  getPropertyPlaceholderSvgUrl,
} from "../utils/propertyPlaceholder";
import { API_BASE_URL } from "../config";

const PROPERTY_TYPE_LABELS = {
  STUDIO: "Γκαρσονιέρα",
  APARTMENT: "Διαμέρισμα",
  MAISONETTE: "Μεζονέτα",
  DETACHED_HOUSE: "Μονοκατοικία",
};

function formatEur(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function PublicPropertyDetails() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [property, setProperty] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await fetch(`${API_BASE_URL}/properties/${id}`);
        const json = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          if (resp.status === 404) setError("Το ακίνητο δεν βρέθηκε ή δεν είναι διαθέσιμο.");
          else if (resp.status === 403) setError("Δεν έχεις πρόσβαση σε αυτό το ακίνητο.");
          else setError(json?.detail || "Σφάλμα φόρτωσης.");
          setProperty(null);
          return;
        }

        setProperty(json);
      } catch {
        setError("Network error");
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  useEffect(() => {
    setImgError(false);
  }, [id]);

  const typeLabel = property?.type ? (PROPERTY_TYPE_LABELS[property.type] || property.type) : "";

  return (
    <>
    <PageContainer>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Ακίνητα προς ενοικίαση
        </Typography>
        <Typography variant="body2" color="text.secondary">·</Typography>
        <Button
          component={RouterLink}
          to="/search"
          size="small"
          variant="text"
          startIcon={<ArrowBackIosNewRoundedIcon sx={{ fontSize: 14 }} />}
          sx={{ color: "text.secondary", textTransform: "none", minWidth: 0, p: 0 }}
        >
          Πίσω στην Αναζήτηση
        </Button>
      </Stack>

      {loading && (
        <Box display="flex" alignItems="center" gap={2} sx={{ py: 4 }}>
          <CircularProgress size={20} />
          <Typography>Φόρτωση...</Typography>
        </Box>
      )}

      {error && <Typography color="error">{error}</Typography>}

      {property && (
        <>
          <PageHeader
            title={property.title}
            description={property.address || undefined}
          />

          <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2, mb: 0 }}>
            <Grid container sx={{ minHeight: { xs: "auto", md: 360 } }}>
              <Grid item xs={12} md={5} sx={{ minHeight: { xs: 240, md: 360 } }}>
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    minHeight: { xs: 240, md: 360 },
                    bgcolor: "grey.200",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={
                      imgError
                        ? getPropertyPlaceholderSvgUrl(property)
                        : getPropertyPhotoUrl(property)
                    }
                    alt=""
                    onError={() => setImgError(true)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box sx={{ p: { xs: 2, sm: 3 }, height: "100%", display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    {typeLabel && <Chip label={typeLabel} size="small" variant="outlined" />}
                    <Chip label={property.status} size="small" variant="outlined" />
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={2}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h4" color="primary" fontWeight={700}>
                      {formatEur(property.price)}
                      <Typography component="span" variant="body2" color="text.secondary" fontWeight={500} sx={{ ml: 0.5 }}>
                        / μήνα
                      </Typography>
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      href="mailto:?subject=Ερώτηση για ακίνητο"
                      sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                    >
                      Επικοινώνησε
                    </Button>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        Εμβαδόν
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {property.size != null ? `${property.size} τ.μ.` : "—"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        Τύπος
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {typeLabel || "—"}
                      </Typography>
                    </Grid>
                  </Grid>

                  {property.description && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Περιγραφή
                        </Typography>
                        <Typography variant="body1">{property.description}</Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </PageContainer>
    <SiteFooter />
    </>
  );
}

export default PublicPropertyDetails;