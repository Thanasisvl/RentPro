import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import { Box, Paper, Typography, Button, Alert, CircularProgress, Stack } from "@mui/material";
import api from "../api";
import StatusChip from "./StatusChip";
import PageContainer from "./layout/PageContainer";
import PageHeader from "./layout/PageHeader";

function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [property, setProperty] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/properties/${id}`);
        setProperty(res.data);
      } catch (e) {
        if (e.response?.status === 404) setError("Το ακίνητο δεν βρέθηκε.");
        else setError("Αποτυχία φόρτωσης ακινήτου.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const canCreateContract = property?.status === "AVAILABLE";

  return (
    <PageContainer>
      <PageHeader
        title="Λεπτομέρειες Ακινήτου"
        description="Προβολή και διαχείριση ακινήτου."
        actions={
          <Button variant="outlined" onClick={() => navigate("/properties")}>
            Πίσω
          </Button>
        }
      />

      <Paper sx={{ p: 3, maxWidth: 760, mx: "auto" }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {property && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h5" sx={{ m: 0 }}>
                {property.title}
              </Typography>
              <StatusChip status={property.status} />
            </Box>
            <Typography><b>Διεύθυνση:</b> {property.address}</Typography>
            <Typography><b>Τύπος:</b> {property.type}</Typography>
            <Typography><b>Εμβαδόν:</b> {property.size}</Typography>
            <Typography><b>Τιμή:</b> {property.price}</Typography>
            <Typography><b>Κατάσταση:</b> {property.status}</Typography>
            {property.description && (
              <Typography sx={{ mt: 1 }}><b>Περιγραφή:</b> {property.description}</Typography>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
              <Button
                variant="contained"
                color="success"
                disabled={!canCreateContract}
                onClick={() => navigate(`/contracts/new?propertyId=${property.id}`)}
              >
                Νέο Συμβόλαιο
              </Button>

              <Button
                variant="outlined"
                component={RouterLink}
                to={`/properties/${property.id}/edit`}
              >
                Επεξεργασία
              </Button>

              {!canCreateContract && (
                <Alert severity="info" sx={{ py: 0.5, alignSelf: "center" }}>
                  Δεν μπορείς να δημιουργήσεις νέο συμβόλαιο όταν το ακίνητο δεν είναι διαθέσιμο.
                </Alert>
              )}
            </Stack>
          </>
        )}
      </Paper>
    </PageContainer>
  );
}

export default PropertyDetails;