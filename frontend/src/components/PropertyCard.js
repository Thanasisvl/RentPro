import React from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import { Link as RouterLink } from "react-router-dom";

function formatEur(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatSize(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n} τ.μ.`;
}

export default function PropertyCard({
  property,
  viewTo,
  score,
  saved = false,
  inCompare = false,
  onToggleSave,
  onToggleCompare,
}) {
  const title = property?.title || `Property #${property?.id ?? "—"}`;
  const address = property?.address || "";
  const type = property?.type || "";
  const status = property?.status || "";

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderColor: "divider",
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={viewTo}
        sx={{ flexGrow: 1, alignItems: "stretch" }}
      >
        <Box
          sx={{
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            borderBottom: 1,
            borderColor: "divider",
            backgroundImage:
              "radial-gradient(700px 240px at 20% 0%, rgba(37, 99, 235, 0.12), transparent 60%)," +
              "radial-gradient(700px 240px at 90% 20%, rgba(14, 165, 164, 0.12), transparent 55%)",
          }}
        >
          <HomeWorkOutlinedIcon sx={{ fontSize: 44, color: "text.disabled" }} />
        </Box>

        <CardContent>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {type && <Chip size="small" label={type} variant="outlined" />}
            {status && <Chip size="small" label={status} variant="outlined" />}
            {typeof score === "number" && Number.isFinite(score) && (
              <Chip
                size="small"
                color="secondary"
                label={`Score: ${score.toFixed(4)}`}
              />
            )}
          </Stack>

          <Typography variant="h6" sx={{ mt: 1 }}>
            {title}
          </Typography>

          {address && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {address}
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 1 }}
            divider={<Box sx={{ width: 1, bgcolor: "divider" }} />}
          >
            <Typography variant="body2">
              <b>{formatSize(property?.size)}</b>
            </Typography>
            <Typography variant="body2">
              <b>{formatEur(property?.price)}</b>
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>

      <CardActions
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          gap: 1,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="text"
            onClick={() => onToggleCompare?.(property)}
          >
            {inCompare ? "Σύγκριση ✓" : "Σύγκριση"}
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => onToggleSave?.(property)}
          >
            {saved ? "Αποθήκευση ✓" : "Αποθήκευση"}
          </Button>
        </Stack>

        <Button size="small" variant="outlined" component={RouterLink} to={viewTo}>
          Προβολή
        </Button>
      </CardActions>
    </Card>
  );
}

