import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { jwtDecode } from 'jwt-decode';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await login(username, password);
      // το login() ήδη αποθηκεύει το token στο localStorage
      const token = res.data.access_token;

      // Διαβάζουμε το role από το JWT
      const decoded = jwtDecode(token); // { sub, type, exp, role, username, ... }
      const role = decoded.role;

      // Redirect ανά ρόλο, όπως γράφεις στο UC-01
      if (role === 'OWNER') {
        navigate('/properties'); // αρχική σελίδα για ιδιοκτήτη
      } else {
        // USER / Tenant
        navigate('/tenants'); // ή όπου θεωρείς "αρχική" για tenant/user
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError('Login failed: ' + err.response.data.detail);
      } else {
        setError('Login failed!');
      }
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Paper elevation={3} sx={{ p: 4, width: 400 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Login
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Password"
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
            Login
          </Button>
          <Button
            variant="text"
            fullWidth
            sx={{ mt: 1 }}
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default LoginForm;