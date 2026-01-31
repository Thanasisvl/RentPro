import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import api from '../api';

function PropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/properties');
        setProperties(res.data);
      } catch (err) {
        console.error('Failed to load properties', err);
        if (err.response && err.response.status === 401) {
          setError('Η συνεδρία έληξε. Κάνε ξανά login.');
        } else {
          setError('Αποτυχία φόρτωσης ιδιοκτησιών.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box mt={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 3, width: '80%' }}>
        <Typography variant="h5" gutterBottom>
          Ιδιοκτησίες
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!error && (
          <List>
            {properties.map((p) => (
              <ListItem key={p.id} divider>
                <ListItemText
                  primary={p.name || `Property #${p.id}`}
                  secondary={p.address}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

export default PropertyList;