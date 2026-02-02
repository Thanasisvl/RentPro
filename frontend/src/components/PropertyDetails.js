import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, Button, Alert, CircularProgress } from '@mui/material';
import api from '../api';
import StatusChip from "./StatusChip";

function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/properties/${id}`);
        setProperty(res.data);
      } catch (e) {
        if (e.response?.status === 404) setError('Το ακίνητο δεν βρέθηκε.');
        else setError('Αποτυχία φόρτωσης ακινήτου.');
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

  return (
    <Box mt={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 3, width: '80%', maxWidth: 720 }}>
        <Typography variant="h5" gutterBottom>
          Λεπτομέρειες Ακινήτου
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {property && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0 }}>{property.title}</h2>
              <StatusChip status={property.status} />
            </div>
            <Typography><b>Διεύθυνση:</b> {property.address}</Typography>
            <Typography><b>Τύπος:</b> {property.type}</Typography>
            <Typography><b>Εμβαδόν:</b> {property.size}</Typography>
            <Typography><b>Τιμή:</b> {property.price}</Typography>
            <Typography><b>Κατάσταση:</b> {property.status}</Typography>
            {property.description && (
              <Typography sx={{ mt: 1 }}><b>Περιγραφή:</b> {property.description}</Typography>
            )}

            <Box display="flex" gap={1} mt={2}>
              <Button
                variant="contained"
                component={RouterLink}
                to={`/properties/${property.id}/edit`}
              >
                Επεξεργασία
              </Button>
              <Button variant="outlined" onClick={() => navigate('/properties')}>
                Πίσω
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default PropertyDetails;