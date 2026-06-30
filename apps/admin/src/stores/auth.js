import { defineStore } from "pinia";
import { api } from "../api.js";

export const useAuth = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("gym_admin_token") || "",
    admin: JSON.parse(localStorage.getItem("gym_admin_user") || "null")
  }),
  getters: {
    isAuthed: (s) => !!s.token
  },
  actions: {
    async login(username, password) {
      const { data } = await api.post("/auth/admin/login", { username, password });
      this._set(data.token, data.admin);
    },
    // Update own username and/or password; the server returns a fresh token.
    async updateProfile(payload) {
      const { data } = await api.put("/auth/admin/me", payload);
      this._set(data.token, data.admin);
    },
    _set(token, admin) {
      this.token = token;
      this.admin = admin;
      localStorage.setItem("gym_admin_token", token);
      localStorage.setItem("gym_admin_user", JSON.stringify(admin));
    },
    logout() {
      this.token = "";
      this.admin = null;
      localStorage.removeItem("gym_admin_token");
      localStorage.removeItem("gym_admin_user");
    }
  }
});
