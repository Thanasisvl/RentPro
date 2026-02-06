import React, { useEffect, useState } from "react";
import { Box, Button, Paper, Typography, CircularProgress } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

import { API_BASE_URL } from "../config";

function PublicPropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [property, setProperty] = useState(null);

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

  return (
    <PageContainer>
      <PageHeader
        title="Λεπτομέρειες Ακινήτου"
        description="Public προβολή διαθέσιμου ακινήτου (UC‑03)."
        actions={
          <Button variant="outlined" onClick={() => navigate("/search")}>
            Πίσω στην Αναζήτηση
          </Button>
        }
      />

      {loading && (
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          <Typography>Φόρτωση...</Typography>
        </Box>
      )}

      {error && <Typography color="error">{error}</Typography>}

      {property && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {property.title}
          </Typography>
          <Typography gutterBottom>{property.address}</Typography>
          <Typography gutterBottom>Τύπος: {property.type}</Typography>
          <Typography gutterBottom>Μέγεθος: {property.size} τ.μ.</Typography>
          <Typography gutterBottom>Τιμή: €{property.price}</Typography>
          <Typography gutterBottom>Κατάσταση: {property.status}</Typography>
        </Paper>
      )}
    </PageContainer>
  );
}

export default PublicPropertyDetails;