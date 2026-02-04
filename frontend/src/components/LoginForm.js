import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await login(username, password);
      // Role-based landing happens in /app
      navigate('/app');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError('Αποτυχία σύνδεσης: ' + err.response.data.detail);
      } else {
        setError('Αποτυχία σύνδεσης.');
      }
    }
  };

  return (
    <PageContainer maxWidthPx={520}>
      <PageHeader
        title="Σύνδεση"
        description="Σύνδεση χρήστη (UC‑01)."
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
            Σύνδεση
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

export default LoginForm;