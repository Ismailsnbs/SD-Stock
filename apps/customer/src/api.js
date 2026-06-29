import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gym_customer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(err, fallback = "Something went wrong.") {
  return err?.response?.data?.error || fallback;
}
