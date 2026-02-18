import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { getAccessToken, getUserRole } from "../api";
import { API_BASE_URL } from "../config";
import SiteFooter from "./layout/SiteFooter";

const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "Όλοι οι τύποι" },
  { value: "STUDIO", label: "Γκαρσονιέρα" },
  { value: "APARTMENT", label: "Διαμέρισμα" },
  { value: "MAISONETTE", label: "Μεζονέτα" },
  { value: "DETACHED_HOUSE", label: "Μονοκατοικία" },
];

const MAX_PRICE_OPTIONS = [
  { value: "", label: "Οποιαδήποτε" },
  { value: "400", label: "€400" },
  { value: "600", label: "€600" },
  { value: "800", label: "€800" },
  { value: "1000", label: "€1.000" },
  { value: "1200", label: "€1.200" },
  { value: "1500", label: "€1.500" },
  { value: "2000", label: "€2.000" },
  { value: "3000", label: "€3.000" },
  { value: "5000", label: "€5.000+" },
];

function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = !!getAccessToken();
  const role = String(getUserRole() || "").toUpperCase().trim();

  const [areas, setAreas] = useState([]);
  const [heroAreaId, setHeroAreaId] = useState("");
  const [heroMaxPrice, setHeroMaxPrice] = useState("");
  const [heroType, setHeroType] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadAreas() {
      try {
        const resp = await fetch(`${API_BASE_URL}/areas/`);
        const json = await resp.json().catch(() => []);
        if (!mounted) return;
        setAreas(Array.isArray(json) ? json : []);
      } catch {
        // non-fatal
      }
    }
    loadAreas();
    return () => { mounted = false; };
  }, []);

  const handleHeroSearch = () => {
    const params = new URLSearchParams();
    if (heroAreaId) params.set("area_id", heroAreaId);
    if (heroMaxPrice) params.set("max_price", heroMaxPrice);
    if (heroType) params.set("type", heroType);
    params.set("offset", "0");
    params.set("limit", "20");
    navigate(`/search?${params.toString()}`);
  };

  return (
    <>
      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f766e 100%)",
          color: "white",
          minHeight: { xs: "70vh", md: "60vh" },
          display: "flex",
          alignItems: "center",
          py: { xs: 4, md: 6 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "url(https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80) center/cover",
            opacity: 0.15,
            zIndex: 0,
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Typography
            component="h1"
            variant="h3"
            sx={{
              fontWeight: 800,
              textAlign: "center",
              mb: 1,
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
              fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.75rem" },
            }}
          >
            Βρες το ιδανικό σπίτι για ενοικίαση
          </Typography>
          <Typography
            sx={{
              textAlign: "center",
              mb: 4,
              opacity: 0.95,
              fontSize: { xs: "1rem", md: "1.125rem" },
              maxWidth: 560,
              mx: "auto",
            }}
          >
            Αναζήτησε ακίνητα, δημιούργησε τις προτιμήσεις σου και λάβε έξυπνες προτάσεις.
          </Typography>

          {/* Hero search box */}
          <Paper
            elevation={8}
            sx={{
              p: 2,
              borderRadius: 3,
              maxWidth: 720,
              mx: "auto",
              bgcolor: "rgba(255,255,255,0.98)",
              color: "text.primary",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="center"
              flexWrap="wrap"
            >
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
                <InputLabel>Περιοχή</InputLabel>
                <Select
                  value={heroAreaId}
                  onChange={(e) => setHeroAreaId(e.target.value)}
                  label="Περιοχή"
                >
                  <MenuItem value="">Όλες οι περιοχές</MenuItem>
                  {areas.map((a) => (
                    <MenuItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 140 } }}>
                <InputLabel>Μέγ. ενοίκιο</InputLabel>
                <Select
                  value={heroMaxPrice}
                  onChange={(e) => setHeroMaxPrice(e.target.value)}
                  label="Μέγ. ενοίκιο"
                >
                  {MAX_PRICE_OPTIONS.map((o) => (
                    <MenuItem key={o.value || "any"} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
                <InputLabel>Τύπος ακινήτου</InputLabel>
                <Select
                  value={heroType}
                  onChange={(e) => setHeroType(e.target.value)}
                  label="Τύπος ακινήτου"
                >
                  {PROPERTY_TYPE_OPTIONS.map((o) => (
                    <MenuItem key={o.value || "any"} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="large"
                onClick={handleHeroSearch}
                startIcon={<SearchRoundedIcon />}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 700,
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Αναζήτηση
              </Button>
            </Stack>
          </Paper>

          {/* Auth CTAs below hero search */}
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            flexWrap="wrap"
            sx={{ mt: 3, gap: 1.5 }}
          >
            {!isAuthenticated ? (
              <>
                <Button
                  variant="outlined"
                  href="/login"
                  onClick={(e) => { e.preventDefault(); navigate("/login"); }}
                  sx={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.8)",
                    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  Σύνδεση
                </Button>
                <Button
                  variant="contained"
                  href="/register"
                  onClick={(e) => { e.preventDefault(); navigate("/register"); }}
                  sx={{
                    bgcolor: "white",
                    color: "primary.dark",
                    "&:hover": { bgcolor: "grey.100" },
                  }}
                >
                  Εγγραφή
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  onClick={() => navigate("/app")}
                  sx={{
                    bgcolor: "white",
                    color: "primary.dark",
                    "&:hover": { bgcolor: "grey.100" },
                  }}
                >
                  Πήγαινε στον πίνακα
                </Button>
                {role === "TENANT" && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/preferences")}
                      sx={{
                        color: "white",
                        borderColor: "rgba(255,255,255,0.8)",
                        "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                      }}
                    >
                      Προτιμήσεις
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/recommendations")}
                      sx={{
                        color: "white",
                        borderColor: "rgba(255,255,255,0.8)",
                        "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                      }}
                    >
                      Προτάσεις
                    </Button>
                  </>
                )}
              </>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Πώς λειτουργεί */}
      <Box sx={{ py: 6, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: "center", mb: 4 }}>
            Πώς λειτουργεί
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            justifyContent="center"
            alignItems="stretch"
          >
            <Card variant="outlined" sx={{ flex: 1, textAlign: "center", borderRadius: 3 }}>
              <CardContent sx={{ py: 3 }}>
                <SearchRoundedIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  1. Αναζήτησε
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ψάξε ακίνητα κατά περιοχή, τιμή και τύπο. Δες λεπτομέρειες χωρίς να συνδεθείς.
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1, textAlign: "center", borderRadius: 3 }}>
              <CardContent sx={{ py: 3 }}>
                <TuneRoundedIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  2. Ορίστε προτιμήσεις
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Πες μας τι σου είναι σημαντικό (τιμή, μέγεθος, περιοχή) μέσω απλών συγκρίσεων (AHP).
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1, textAlign: "center", borderRadius: 3 }}>
              <CardContent sx={{ py: 3 }}>
                <RecommendRoundedIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  3. Λάβε προτάσεις
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Λάβε προτάσεις ακινήτων βαθμολογημένες ανάλογα με τις προτιμήσεις σου (TOPSIS).
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>

      {/* Για ποιους */}
      <Box sx={{ py: 6, bgcolor: "grey.50" }}>
        <Container maxWidth="lg">
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: "center", mb: 4 }}>
            Για ποιους είναι το RentPro
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            justifyContent="center"
            alignItems="stretch"
          >
            <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, boxShadow: 1 }}>
              <CardContent sx={{ py: 3 }}>
                <PersonOutlineRoundedIcon sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Ενοικιαστές
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Αναζήτησε ακίνητα, δημιούργησε το προφίλ προτιμήσεων σου και λάβε προτάσεις που ταιριάζουν σε εσένα.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate("/search")}
                >
                  Αναζήτηση
                </Button>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, boxShadow: 1 }}>
              <CardContent sx={{ py: 3 }}>
                <HomeWorkOutlinedIcon sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Ιδιοκτήτες
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Διαχείριση ακινήτων, ενοικιαστών και συμβολαίων από ένα σημείο.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(isAuthenticated ? "/properties" : "/login")}
                >
                  {isAuthenticated ? "Τα ακίνητά μου" : "Σύνδεση"}
                </Button>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1, borderRadius: 3, boxShadow: 1 }}>
              <CardContent sx={{ py: 3 }}>
                <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Διαχειριστές
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Διαχείριση χρηστών, περιοχών και όλων των δεδομένων της πλατφόρμας.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(isAuthenticated ? "/app/admin" : "/login")}
                >
                  {isAuthenticated ? "Διαχείριση" : "Σύνδεση"}
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>

      <SiteFooter />
    </>
  );
}

export default LandingPage;
