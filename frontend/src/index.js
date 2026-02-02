import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    background: {
      default: '#f5f6f8', // or '#f4f4f5'
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 14,
  },
  // Soft shadows (keep it subtle)
  shadows: [
    'none',
    '0px 1px 2px rgba(16, 24, 40, 0.06), 0px 1px 3px rgba(16, 24, 40, 0.10)', // 1
    '0px 2px 4px rgba(16, 24, 40, 0.06), 0px 4px 10px rgba(16, 24, 40, 0.10)', // 2
    ...Array(22).fill('0px 2px 8px rgba(16, 24, 40, 0.08)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f5f6f8',
          // Very subtle gradient (ON)
          backgroundImage:
            'radial-gradient(1200px 600px at 20% -10%, rgba(99, 102, 241, 0.10), transparent 55%),' +
            'radial-gradient(1000px 500px at 90% 0%, rgba(16, 185, 129, 0.08), transparent 50%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 1, // white cards with soft shadow by default
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);