import { useSyncExternalStore } from "react";
import { getAccessToken, getUserRole, subscribeAuthChange } from "../api";

function normalizeRole(raw) {
  const r = String(raw || "").toUpperCase().trim();
  if (r === "ADMIN") return "ADMIN";
  if (r === "OWNER") return "OWNER";
  if (r === "USER") return "TENANT";
  return "TENANT";
}

const SERVER_SNAPSHOT = { isAuthenticated: false, role: "TENANT" };

let cachedSnapshot = SERVER_SNAPSHOT;

function getAuthSnapshot() {
  const isAuthenticated = !!getAccessToken();
  const role = normalizeRole(getUserRole());
  if (
    cachedSnapshot.isAuthenticated === isAuthenticated &&
    cachedSnapshot.role === role
  ) {
    return cachedSnapshot;
  }
  cachedSnapshot = { isAuthenticated, role };
  return cachedSnapshot;
}

export function useAuthSession() {
  return useSyncExternalStore(subscribeAuthChange, getAuthSnapshot, () => SERVER_SNAPSHOT);
}

export { normalizeRole };
