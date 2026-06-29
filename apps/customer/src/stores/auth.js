import { defineStore } from "pinia";
import { api } from "../api.js";

// Infinite session: the token has no expiry and lives in localStorage,
// so a logged-in member stays logged in until they tap "Log out".
export const useAuth = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("gym_customer_token") || "",
    customer: JSON.parse(localStorage.getItem("gym_customer_user") || "null")
  }),
  getters: {
    isLoggedIn: (s) => !!s.token && !!s.customer
  },
  actions: {
    async login(loginId, password) {
      const { data } = await api.post("/auth/customer/login", { loginId, password });
      this._set(data.token, data.customer);
    },
    _set(token, customer) {
      this.token = token;
      this.customer = customer;
      localStorage.setItem("gym_customer_token", token);
      localStorage.setItem("gym_customer_user", JSON.stringify(customer));
    },
    // Validate a persisted token on app start; silently log out if it's gone stale.
    async refresh() {
      if (!this.token) return;
      try {
        const { data } = await api.get("/auth/customer/me");
        this._set(this.token, data.customer);
      } catch {
        this.logout();
      }
    },
    logout() {
      this.token = "";
      this.customer = null;
      localStorage.removeItem("gym_customer_token");
      localStorage.removeItem("gym_customer_user");
    }
  }
});
