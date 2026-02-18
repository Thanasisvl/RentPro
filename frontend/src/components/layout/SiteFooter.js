import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../api";

export default function SiteFooter() {
  const navigate = useNavigate();
  const isAuthenticated = !!getAccessToken();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        bgcolor: "grey.900",
        color: "grey.300",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body2">
            © RentPro — Αναζήτηση ακινήτων & έξυπνες προτάσεις
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              size="small"
              href="/search"
              onClick={(e) => {
                e.preventDefault();
                navigate("/search");
              }}
              sx={{ color: "grey.400", textTransform: "none" }}
            >
              Αναζήτηση
            </Button>
            {!isAuthenticated && (
              <>
                <Button
                  size="small"
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/login");
                  }}
                  sx={{ color: "grey.400", textTransform: "none" }}
                >
                  Σύνδεση
                </Button>
                <Button
                  size="small"
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/register");
                  }}
                  sx={{ color: "grey.400", textTransform: "none" }}
                >
                  Εγγραφή
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
