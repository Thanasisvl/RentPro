import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  MenuItem,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';

function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/users/register', {
        username,
        email,
        full_name: fullName,
        password,
        role, // "USER" ή "OWNER"
      });

      // Επιτυχής εγγραφή → redirect στο login
      navigate('/login');
    } catch (err) {
      const detail =
        err.response && err.response.data && err.response.data.detail;
      setError(`Αποτυχία εγγραφής${detail ? `: ${detail}` : ''}`);
    }
  };

  return (
    <PageContainer maxWidthPx={520}>
      <PageHeader
        title="Εγγραφή"
        description="Δημιουργία λογαριασμού (UC‑01)."
      />

      <Paper elevation={3} sx={{ p: 4 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Όνομα χρήστη"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Ονοματεπώνυμο"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            select
            label="Τύπος λογαριασμού"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            fullWidth
            margin="normal"
            required
          >
            <MenuItem value="USER">Ενοικιαστής</MenuItem>
            <MenuItem value="OWNER">Ιδιοκτήτης</MenuItem>
          </TextField>
          <TextField
            label="Κωδικός"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            Εγγραφή
          </Button>
          <Button
            variant="text"
            fullWidth
            sx={{ mt: 1 }}
            onClick={() => navigate('/')}
          >
            Πίσω στην αρχική
          </Button>
        </form>
      </Paper>
    </PageContainer>
  );
}

export default RegisterForm;