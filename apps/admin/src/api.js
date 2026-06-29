import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

// Attach the admin token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gym_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Bounce back to login on auth failure.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/login")) {
      localStorage.removeItem("gym_admin_token");
      if (location.hash !== "#/login") location.assign("#/login");
    }
    return Promise.reject(err);
  }
);

export function apiError(err, fallback = "Something went wrong.") {
  return err?.response?.data?.error || fallback;
}

// Download a file from an authorized endpoint (templates / exports).
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
