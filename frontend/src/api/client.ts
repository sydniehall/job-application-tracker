import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { token } from "./token";
import type { Token } from "../index";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
  // Send the httpOnly refresh cookie on /auth requests.
  withCredentials: true,
  // Array params as repeated bare keys (?a=1&a=2) instead of axios's
  // default a[]=1&a[]=2 — matches what FastAPI's list query params expect.
  paramsSerializer: { indexes: null },
});

// Attach JWT to every outgoing request.
client.interceptors.request.use((config) => {
  const value = token.get();
  if (value) {
    config.headers.Authorization = `Bearer ${value}`;
  }
  return config;
});

// Endpoints where a 401 is a real answer, not an expired access token.
const NO_REFRESH_URLS = ["/auth/token", "/auth/refresh", "/auth/logout"];

// Single-flight: concurrent 401s share one refresh request, so rotation
// doesn't revoke a token another request is about to use.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  refreshPromise ??= axios
    .post<Token>(`${import.meta.env.VITE_API_URL}/auth/refresh`, null, {
      withCredentials: true,
    })
    .then((res) => {
      token.set(res.data.access_token);
      return res.data.access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// On 401: try a silent refresh once and replay the request; if that fails,
// clear the token and redirect to login.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const original = error.config as RetriableConfig | undefined;
    const canRefresh =
      original &&
      !original._retry &&
      !NO_REFRESH_URLS.some((url) => original.url?.startsWith(url));

    if (canRefresh) {
      original._retry = true;
      try {
        const fresh = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${fresh}`;
        return client(original);
      } catch {
        // Refresh failed — fall through to the logout path.
      }
    }

    token.clear();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
