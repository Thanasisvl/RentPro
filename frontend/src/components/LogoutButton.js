import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api, { clearAccessToken } from '../api';

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // ενημερώνουμε το backend να σβήσει το refresh cookie
      await api.post('/logout');
    } catch (e) {
      // αγνοούμε τυχόν error (π.χ. ήδη ληγμένο cookie)
    }

    // πετάμε το access token από το client
    clearAccessToken();

    navigate('/login');
  };

  return (
    <Button color="inherit" onClick={handleLogout}>
      Logout
    </Button>
  );
}

export default LogoutButton;