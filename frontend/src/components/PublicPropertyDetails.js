import React, { useEffect, useState } from "react";
import { Box, Button, Container, Paper, Typography, CircularProgress } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

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
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Button variant="text" onClick={() => navigate("/search")} sx={{ mb: 2 }}>
        Πίσω στην Αναζήτηση
      </Button>

      {loading && (
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          <Typography>Φόρτωση...</Typography>
        </Box>
      )}

      {error && <Typography color="error">{error}</Typography>}

      {property && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {property.title}
          </Typography>
          <Typography gutterBottom>{property.address}</Typography>
          <Typography gutterBottom>Τύπος: {property.type}</Typography>
          <Typography gutterBottom>Μέγεθος: {property.size} τ.μ.</Typography>
          <Typography gutterBottom>Τιμή: €{property.price}</Typography>
          <Typography gutterBottom>Κατάσταση: {property.status}</Typography>
        </Paper>
      )}
    </Container>
  );
}

export default PublicPropertyDetails;