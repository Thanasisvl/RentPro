import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import api from '../api';

const STATUSES = ['AVAILABLE', 'RENTED', 'INACTIVE'];

function PropertyForm({ mode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    type: '',
    size: '',
    price: '',
    status: 'AVAILABLE',
  });

  useEffect(() => {
    if (!isEdit) return;

    const fetchProperty = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/properties/${id}`);
        const p = res.data;
        setForm({
          title: p.title ?? '',
          description: p.description ?? '',
          address: p.address ?? '',
          type: p.type ?? '',
          size: String(p.size ?? ''),
          price: String(p.price ?? ''),
          status: p.status ?? 'AVAILABLE',
        });
      } catch (e) {
        setError('Αποτυχία φόρτωσης ακινήτου.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [isEdit, id]);

  const onChange = (key) => (evt) => {
    setForm((prev) => ({ ...prev, [key]: evt.target.value }));
  };

  const onSubmit = async (evt) => {
    evt.preventDefault();
    setError('');

    const payload = {
      title: form.title,
      description: form.description,
      address: form.address,
      type: form.type,
      size: Number(form.size),
      price: Number(form.price),
      status: form.status,
    };

    try {
      if (isEdit) {
        await api.put(`/properties/${id}`, payload);
        navigate(`/properties/${id}`);
      } else {
        const res = await api.post('/properties/', payload);
        navigate(`/properties/${res.data.id}`);
      }
    } catch (e) {
      if (e.response?.status === 422) setError('Μη έγκυρα στοιχεία (π.χ. κενά/λάθος τιμές).');
      else if (e.response?.status === 403) setError('Δεν έχεις δικαίωμα για αυτή την ενέργεια.');
      else setError('Αποτυχία αποθήκευσης.');
    }
  };

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
          {isEdit ? 'Επεξεργασία Ακινήτου' : 'Νέο Ακίνητο'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} display="grid" gap={2}>
          <TextField label="Τίτλος" value={form.title} onChange={onChange('title')} required />
          <TextField
            label="Περιγραφή"
            value={form.description}
            onChange={onChange('description')}
            multiline
            minRows={3}
          />
          <TextField label="Διεύθυνση" value={form.address} onChange={onChange('address')} required />
          <TextField label="Τύπος" value={form.type} onChange={onChange('type')} required />

          <TextField
            label="Εμβαδόν (m²)"
            value={form.size}
            onChange={onChange('size')}
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            required
          />
          <TextField
            label="Τιμή (€)"
            value={form.price}
            onChange={onChange('price')}
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            required
          />

          <TextField label="Κατάσταση" value={form.status} onChange={onChange('status')} select>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <Box display="flex" gap={1}>
            <Button type="submit" variant="contained">
              Αποθήκευση
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(isEdit ? `/properties/${id}` : '/properties')}
            >
              Ακύρωση
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default PropertyForm;