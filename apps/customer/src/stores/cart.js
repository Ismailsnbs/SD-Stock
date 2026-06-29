import { defineStore } from "pinia";

export const useCart = defineStore("cart", {
  state: () => ({ lines: {} }), // productId -> { product, quantity }
  getters: {
    items: (s) => Object.values(s.lines),
    count: (s) => Object.values(s.lines).reduce((n, l) => n + l.quantity, 0),
    total: (s) => Object.values(s.lines).reduce((n, l) => n + l.product.sellingPrice * l.quantity, 0),
    isEmpty: (s) => Object.keys(s.lines).length === 0,
    qtyOf: (s) => (id) => s.lines[id]?.quantity || 0
  },
  actions: {
    add(product) {
      const line = this.lines[product.id];
      const next = (line?.quantity || 0) + 1;
      if (next > product.count) return false; // respect available stock
      this.lines[product.id] = { product, quantity: next };
      return true;
    },
    setQty(product, qty) {
      const clamped = Math.max(0, Math.min(qty, product.count));
      if (clamped === 0) delete this.lines[product.id];
      else this.lines[product.id] = { product, quantity: clamped };
    },
    remove(id) { delete this.lines[id]; },
    clear() { this.lines = {}; },
    payload() {
      return this.items.map((l) => ({ productId: l.product.id, quantity: l.quantity }));
    }
  }
});
