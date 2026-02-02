import React from "react";
import { Chip } from "@mui/material";

function statusToChipProps(status) {
  const s = String(status || "").toUpperCase();

  switch (s) {
    case "AVAILABLE":
      return { label: "AVAILABLE", color: "success", variant: "filled" };
    case "RENTED":
      return { label: "RENTED", color: "warning", variant: "filled" };
    case "INACTIVE":
      return { label: "INACTIVE", color: "default", variant: "outlined" };
    default:
      return { label: s || "UNKNOWN", color: "default", variant: "outlined" };
  }
}

export default function StatusChip({ status, size = "small" }) {
  const props = statusToChipProps(status);
  return <Chip size={size} {...props} />;
}