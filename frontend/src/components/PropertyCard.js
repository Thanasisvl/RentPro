import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  getPropertyPhotoUrl,
  getPropertyPlaceholderSvgUrl,
} from "../utils/propertyPlaceholder";

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

// NEW: enum label helpers (backend enums -> Greek labels)
function normalizeEnum(v) {
  if (v == null) return "";
  return String(v).trim().toUpperCase();
}

const PROPERTY_TYPE_LABELS = {
  STUDIO: "Γκαρσονιέρα",
  APARTMENT: "Διαμέρισμα",
  MAISONETTE: "Μεζονέτα",
  DETACHED_HOUSE: "Μονοκατοικία",
};

const PROPERTY_STATUS_LABELS = {
  AVAILABLE: "Διαθέσιμο",
  RENTED: "Ενοικιασμένο",
  INACTIVE: "Ανενεργό",
};

function labelFrom(map, raw) {
  const key = normalizeEnum(raw);
  return map[key] || raw || "";
}

export default function PropertyCard({
  property,
  viewTo,
  score,
  rank,
  saved = false,
  inCompare = false,
  onToggleSave,
  onToggleCompare,
}) {
  const title = property?.title || `Property #${property?.id ?? "—"}`;
  const address = property?.address || "";
  const areaName = property?.area?.name || "";
  const type = property?.type || "";
  const status = property?.status || "";

  const typeLabel = labelFrom(PROPERTY_TYPE_LABELS, type);
  const statusLabel = labelFrom(PROPERTY_STATUS_LABELS, status);

  const [imgError, setImgError] = useState(false);
  const thumbUrl = imgError
    ? getPropertyPlaceholderSvgUrl(property)
    : getPropertyPhotoUrl(property);

  const scorePct =
    typeof score === "number" && Number.isFinite(score)
      ? Math.round(Math.max(0, Math.min(1, score)) * 100)
      : null;

  // color scale for score
  const scoreColor =
    scorePct == null
      ? "default"
      : scorePct >= 80
        ? "success"
        : scorePct >= 60
          ? "info"
          : scorePct >= 40
            ? "warning"
            : "error";

  // Thumbnail: 400×280 aspect ratio (matches downloaded images) for consistent dimensions
  const imageBox = (
    <Box
      sx={{
        width: { xs: "100%", md: "42%" },
        minWidth: 0,
        flexShrink: 0,
        height: { xs: "auto", md: "100%" },
        aspectRatio: { xs: "400 / 280" },
        overflow: "hidden",
        bgcolor: "grey.200",
        borderBottom: { xs: 1, md: 0 },
        borderRight: { md: 1 },
        borderColor: "divider",
      }}
    >
      <img
        src={thumbUrl}
        alt=""
        onError={() => setImgError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          verticalAlign: "middle",
        }}
      />
    </Box>
  );

  const contentBox = (
    <CardContent sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", py: { md: 1.5 } }}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {typeof rank === "number" && Number.isFinite(rank) && rank > 0 ? (
          <Chip size="small" color="primary" label={`#${rank}`} />
        ) : null}
        {typeLabel && <Chip size="small" label={typeLabel} variant="outlined" />}
        {statusLabel && <Chip size="small" label={statusLabel} variant="outlined" />}
        {scorePct != null ? (
          <Chip size="small" color={scoreColor} label={`Σκορ ${scorePct}`} />
        ) : null}
      </Stack>

      <Typography
        variant="h6"
        sx={{
          mt: 1,
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {title}
      </Typography>

      {address && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {address}
        </Typography>
      )}
      {areaName && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.25, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {areaName}
        </Typography>
      )}

      <Stack
        direction="row"
        spacing={2}
        alignItems="baseline"
        sx={{ mt: 1.5 }}
        divider={<Divider orientation="vertical" flexItem />}
      >
        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          {formatEur(property?.price)}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500 }}>
            / μήνα
          </Typography>
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {formatSize(property?.size)}
        </Typography>
      </Stack>
    </CardContent>
  );

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        borderColor: "divider",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={viewTo}
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "stretch",
        }}
      >
        {imageBox}
        {contentBox}
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare?.(property); }}
          >
            {inCompare ? "Σύγκριση ✓" : "Σύγκριση"}
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave?.(property); }}
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

