import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#F7F8FA",
      paper: "#FFFFFF",
    },
    divider: "#E6E8EC",
    text: {
      primary: "#111827",
      secondary: "#4B5563",
      disabled: "#9CA3AF",
    },
    primary: {
      main: "#2563EB",
      dark: "#1D4ED8",
      light: "#60A5FA",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#0EA5A4",
      dark: "#0F766E",
      light: "#5EEAD4",
      contrastText: "#062A2A",
    },
    success: { main: "#16A34A" },
    warning: { main: "#F59E0B" },
    error: { main: "#DC2626" },
    info: { main: "#0284C7" },
  },

  typography: {
    fontFamily:
      "Aptos, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    h4: { fontSize: "28px", fontWeight: 700, lineHeight: 1.2 },
    h5: { fontSize: "22px", fontWeight: 700, lineHeight: 1.25 },
    h6: { fontSize: "18px", fontWeight: 700, lineHeight: 1.3 },
    body1: { fontSize: "16px", lineHeight: 1.6 },
    body2: { fontSize: "14px", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600 },
  },

  shape: { borderRadius: 12 },

  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #E6E8EC",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingLeft: 14,
          paddingRight: 14,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});

