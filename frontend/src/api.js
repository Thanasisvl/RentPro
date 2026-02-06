import axios from "axios";

import { API_BASE_URL } from "./config";

// Χρησιμοποιούμε localStorage, όπως ήδη κάνεις στο LoginForm
const ACCESS_TOKEN_KEY = "token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

// NEW: role helper (decode JWT payload)
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getUserRole() {
  const token = getAccessToken();
  if (!token) return "";
  return parseJwt(token)?.role || "";
}

// Κύριος axios client
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // για HttpOnly refresh cookie
});

// Ξεχωριστός client για refresh (χωρίς interceptor recursion)
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor: βάζει Authorization αν υπάρχει token
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// State για να μην γίνονται πολλαπλά refresh ταυτόχρονα
let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = refreshClient
      .post("/auth/refresh")
      .then((response) => {
        const newToken = response.data?.access_token;
        if (!newToken) {
          throw new Error("No access_token in refresh response");
        }
        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        isRefreshing = false;
      });
  }
  return refreshPromise;
}

// Response interceptor: σε 401 -> δοκιμάζει refresh και retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const url = originalRequest?.url || "";

    const isAuthRoute =
      url.includes("/login") ||
      url.includes("/users/register") ||
      url.includes("/auth/refresh");

    if (status !== 401 || isAuthRoute) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      return Promise.reject(refreshError);
    }
  }
);

// Helper για login
export async function login(username, password) {
  const res = await api.post("/login", { username, password });
  const token = res.data?.access_token;
  if (!token) {
    throw new Error("No access_token in login response");
  }
  setAccessToken(token);
  return res.data;
}

export default api;