import React from "react";
import { Container } from "@mui/material";

const DEFAULT_MAX_WIDTH_PX = 1400;

export default function PageContainer({ children, maxWidthPx = DEFAULT_MAX_WIDTH_PX, sx }) {
  return (
    <Container
      maxWidth={false}
      sx={{
        maxWidth: maxWidthPx,
        mx: "auto",
        px: { xs: 2, sm: 2 },
        py: 3, // 24px vertical rhythm (3 * theme.spacing(8))
        ...sx,
      }}
    >
      {children}
    </Container>
  );
}

