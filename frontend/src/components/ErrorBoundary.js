import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Useful in dev; in prod you could send this to a logging endpoint.
    // eslint-disable-next-line no-console
    console.error("UI error boundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error?.message || "Κάτι πήγε στραβά στο UI.";

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          bgcolor: "background.default",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 640,
            width: "100%",
            p: 3,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
            Σφάλμα εφαρμογής
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {message}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Paper>
      </Box>
    );
  }
}

