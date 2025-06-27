import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Paper, Typography, TextField, Button, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function OwnerRegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  // Property fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post('http://localhost:8000/users/register-owner', {
        username,
        email,
        full_name: fullName,
        password,
        property: {
          title,
          description,
          address,
          type,
          size: parseFloat(size),
          price: parseFloat(price)
        }
      });
      setSuccess('Registration successful! You can now log in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError('Registration failed: ' + err.response.data.detail);
      } else {
        setError('Registration failed!');
      }
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Paper elevation={3} sx={{ p: 4, width: 400 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Owner Registration
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth margin="normal" required />
          <Typography variant="h6" sx={{ mt: 2 }}>Property Details</Typography>
          <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Address" value={address} onChange={e => setAddress(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Type" value={type} onChange={e => setType(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Size (sqm)" type="number" value={size} onChange={e => setSize(e.target.value)} fullWidth margin="normal" required />
          <TextField label="Price (€)" type="number" value={price} onChange={e => setPrice(e.target.value)} fullWidth margin="normal" required />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Register</Button>
          <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={() => navigate('/')}>Back to Home</Button>
        </form>
      </Paper>
    </Box>
  );
}

export default OwnerRegisterForm;