import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../api';

function RequireAuth({ children }) {
  const token = getAccessToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default RequireAuth;