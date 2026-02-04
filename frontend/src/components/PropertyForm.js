import React, { useEffect, useMemo, useState } from 'react';
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
  Divider,
  Stack,
  Grid,
} from '@mui/material';
import api from '../api';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';

const STATUSES = ['AVAILABLE', 'RENTED', 'INACTIVE'];
const PROPERTY_TYPES = ['STUDIO', 'APARTMENT', 'MAISONETTE', 'DETACHED_HOUSE'];

const STATUS_LABEL = {
  AVAILABLE: 'Διαθέσιμο',
  RENTED: 'Ενοικιασμένο',
  INACTIVE: 'Ανενεργό',
};

const TYPE_LABEL = {
  STUDIO: 'Studio',
  APARTMENT: 'Διαμέρισμα',
  MAISONETTE: 'Μεζονέτα',
  DETACHED_HOUSE: 'Μονοκατοικία',
};

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

  const fieldErrors = useMemo(() => {
    const e = {};
    if (!String(form.title || '').trim()) e.title = 'Ο τίτλος είναι υποχρεωτικός.';
    if (!String(form.address || '').trim()) e.address = 'Η διεύθυνση είναι υποχρεωτική.';
    if (!String(form.type || '').trim()) e.type = 'Επίλεξε τύπο ακινήτου.';

    const size = Number(form.size);
    if (!Number.isFinite(size) || size <= 0) e.size = 'Δώσε εμβαδόν > 0.';

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) e.price = 'Δώσε τιμή > 0.';
    return e;
  }, [form.title, form.address, form.type, form.size, form.price]);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const onSubmit = async (evt) => {
    evt.preventDefault();
    setError('');

    const payload = {
      title: form.title,
      description: form.description,
      address: form.address,
      type: String(form.type || '').trim().toUpperCase(),
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
    <PageContainer>
      <PageHeader
        title={isEdit ? 'Επεξεργασία Ακινήτου' : 'Νέο Ακίνητο'}
        description="Δημιουργία/ενημέρωση βασικών στοιχείων ακινήτου (UC‑02)."
      />

      <Paper sx={{ p: 3, maxWidth: 760, mx: 'auto' }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Βασικά στοιχεία
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Τίτλος"
                  value={form.title}
                  onChange={onChange('title')}
                  required
                  error={!!fieldErrors.title}
                  helperText={fieldErrors.title || 'Π.χ. “Διαμέρισμα 2ΥΔ στο κέντρο”.'}
                />
                <TextField
                  label="Περιγραφή"
                  value={form.description}
                  onChange={onChange('description')}
                  multiline
                  minRows={3}
                  helperText="Σύντομη περιγραφή για το ακίνητο."
                />
                <TextField
                  label="Διεύθυνση"
                  value={form.address}
                  onChange={onChange('address')}
                  required
                  error={!!fieldErrors.address}
                  helperText={fieldErrors.address || 'Περιοχή / οδός / στοιχεία τοποθεσίας.'}
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Χαρακτηριστικά
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Τύπος ακινήτου"
                  value={String(form.type || '').trim().toUpperCase()}
                  onChange={onChange('type')}
                  select
                  required
                  error={!!fieldErrors.type}
                  helperText={fieldErrors.type || 'Επίλεξε τον τύπο που ταιριάζει καλύτερα.'}
                >
                  {PROPERTY_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {TYPE_LABEL[t] || t}
                    </MenuItem>
                  ))}
                </TextField>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Εμβαδόν (τ.μ.)"
                      value={form.size}
                      onChange={onChange('size')}
                      type="number"
                      inputProps={{ min: 0.01, step: '0.01' }}
                      required
                      error={!!fieldErrors.size}
                      helperText={fieldErrors.size || 'π.χ. 75'}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Τιμή (€/μήνα)"
                      value={form.price}
                      onChange={onChange('price')}
                      type="number"
                      inputProps={{ min: 0.01, step: '0.01' }}
                      required
                      error={!!fieldErrors.price}
                      helperText={fieldErrors.price || 'π.χ. 850'}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Κατάσταση
              </Typography>
              <TextField
                label="Κατάσταση"
                value={form.status}
                onChange={onChange('status')}
                select
                helperText="Η κατάσταση καθορίζει τη διαθεσιμότητα."
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {STATUS_LABEL[s] || s}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box display="flex" gap={1}>
              <Button type="submit" variant="contained" disabled={hasErrors}>
                Αποθήκευση
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(isEdit ? `/properties/${id}` : '/properties')}
              >
                Ακύρωση
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </PageContainer>
  );
}

export default PropertyForm;