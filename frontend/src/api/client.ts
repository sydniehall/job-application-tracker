import axios from "axios";
import { token } from "./token";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every outgoing request.
client.interceptors.request.use((config) => {
  const value = token.get();
  if (value) {
    config.headers.Authorization = `Bearer ${value}`;
  }
  return config;
});

// On 401, clear the token and redirect to login.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      token.clear();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;