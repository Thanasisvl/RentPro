import React from "react";
import { Box, Stack, Typography } from "@mui/material";

export default function PageHeader({ title, description, actions }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      sx={{ mb: 3 }} // 24px
    >
      <Box>
        <Typography variant="h4">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>

      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  );
}

