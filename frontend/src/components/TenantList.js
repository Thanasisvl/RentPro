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

function TenantList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/tenants');
        setTenants(res.data);
      } catch (err) {
        console.error('Failed to load tenants', err);
        if (err.response && err.response.status === 401) {
          setError('Η συνεδρία έληξε. Κάνε ξανά login.');
        } else {
          setError('Αποτυχία φόρτωσης ενοικιαστών.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
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
          Ενοικιαστές
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!error && (
          <List>
            {tenants.map((t) => (
              <ListItem key={t.id} divider>
                <ListItemText
                  primary={t.name || `Tenant #${t.id}`}
                  secondary={t.email || t.phone}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

export default TenantList;