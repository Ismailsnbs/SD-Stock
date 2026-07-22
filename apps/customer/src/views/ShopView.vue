<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, apiError } from "../api.js";
import { useCart } from "../stores/cart.js";
import { useAuth } from "../stores/auth.js";
import { useToast } from "../stores/toast.js";

const router = useRouter();
const cart = useCart();
const auth = useAuth();
const toast = useToast();
const { t } = useI18n();

const products = ref([]);
const loading = ref(true);
const search = ref("");

const sheetOpen = ref(false);
const checkoutOpen = ref(false);
const placing = ref(false);

// Guest checkout member picker (combobox) — guarantees an exact member match.
const members = ref([]);
const memberQuery = ref("");
const selectedMember = ref(null);
const comboOpen = ref(false);

const money = (n) => `₺${Number(n).toLocaleString("tr-TR")}`;

// Member balance chip (admin-toggleable). Positive = wallet credit, negative = debt.
const showBalance = computed(() => auth.isLoggedIn && auth.showBalance);
const balancePositive = computed(() => auth.netBalance >= 0);
const balanceLabel = computed(() => {
  const v = auth.netBalance;
  return v < 0 ? `−${money(Math.abs(v))}` : money(v);
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? products.value.filter((p) => p.name.toLowerCase().includes(q)) : products.value;
});

// Membership warning: expired, or ending within 5 days.
const mshipDays = computed(() =>
  auth.isLoggedIn && auth.customer?.membershipEnd
    ? Math.ceil((new Date(auth.customer.membershipEnd) - Date.now()) / 86400000)
    : null
);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/products/storefront");
    products.value = data;
  } catch (e) {
    toast.err(apiError(e, t("shop.loadFailed")));
  } finally {
    loading.value = false;
  }
}

async function loadMembers() {
  if (auth.isLoggedIn) return; // only guests need the picker
  try {
    const { data } = await api.get("/customers/public");
    members.value = data;
  } catch { /* picker stays empty; front desk can help */ }
}

onMounted(() => { load(); loadMembers(); if (auth.isLoggedIn) auth.refresh(); });

const filteredMembers = computed(() => {
  const q = memberQuery.value.trim().toLowerCase();
  const list = q ? members.value.filter((m) => m.name.toLowerCase().includes(q)) : members.value;
  return list.slice(0, 30);
});

function pickMember(m) {
  selectedMember.value = m;
  memberQuery.value = m.name;
  comboOpen.value = false;
}
function onComboInput() {
  // typing invalidates a previous pick until they choose again
  selectedMember.value = null;
  comboOpen.value = true;
}

function add(p) {
  if (!p.inStock) return;
  if (!cart.add(p)) toast.err(t("shop.onlyLeft", { n: p.count, name: p.name }));
}
function inc(p) { add(p); }
function dec(p) { cart.setQty(p, cart.qtyOf(p.id) - 1); }

function startCheckout() {
  if (cart.isEmpty) return;
  sheetOpen.value = false;
  checkoutOpen.value = true;
}

async function placeOrder() {
  placing.value = true;
  try {
    let sale;
    if (auth.isLoggedIn) {
      ({ data: sale } = await api.post("/sales/checkout", { items: cart.payload() }));
    } else {
      if (!selectedMember.value) {
        toast.err(t("shop.selectName"));
        placing.value = false;
        return;
      }
      ({ data: sale } = await api.post("/sales/guest", {
        customerId: selectedMember.value.id,
        customerName: selectedMember.value.name,
        items: cart.payload()
      }));
    }
    toast.ok(t("shop.orderPlaced", { total: money(sale.total) }));
    cart.clear();
    checkoutOpen.value = false;
    selectedMember.value = null;
    memberQuery.value = "";
    load();
    if (auth.isLoggedIn) auth.refresh(); // reflect the new balance in the header
  } catch (e) {
    toast.err(apiError(e, t("shop.checkoutFailed")));
  } finally {
    placing.value = false;
  }
}
</script>

<template>
  <div class="shop">
    <header class="bar">
      <button class="icon-btn" @click="router.push('/')" aria-label="Back">←</button>
      <div class="bar-title">
        <span class="eyebrow">{{ auth.isLoggedIn ? auth.customer.name : t('shop.quickBuy') }}</span>
        <h2>{{ t('shop.title') }}</h2>
      </div>
      <span v-if="mshipDays !== null && mshipDays > 0 && mshipDays <= 5" class="mship-chip num">⏳ {{ t('shop.mshipEnding', { n: mshipDays }) }}</span>
      <router-link
        v-if="showBalance"
        to="/account"
        class="balance-chip num"
        :class="{ neg: !balancePositive }"
        :aria-label="t('shop.balance')"
      >{{ balanceLabel }}</router-link>
      <button v-if="auth.isLoggedIn" class="icon-btn" @click="router.push('/account')" aria-label="Account">◉</button>
      <button v-else class="icon-btn" @click="router.push('/login')" aria-label="Login">⤓</button>
    </header>

    <div class="search-wrap">
      <input v-model="search" :placeholder="t('shop.search')" />
    </div>

    <div v-if="mshipDays !== null && mshipDays <= 0" class="mship-warn expired">
      <span aria-hidden="true">⚠</span>
      {{ t('shop.mshipExpired') }}
    </div>

    <div v-if="loading" class="state">{{ t('shop.loading') }}</div>
    <div v-else-if="!filtered.length" class="state">{{ t('shop.empty') }}</div>

    <div class="grid" :class="{ 'has-cart': !cart.isEmpty }">
      <article v-for="p in filtered" :key="p.id" class="tile" :class="{ out: !p.inStock, featured: p.featured }">
        <div class="tile-top">
          <span v-if="p.featured" class="star" :title="t('shop.featured')" aria-hidden="true">★</span>
          <span class="pill" :class="p.inStock ? (p.count <= 5 ? 'pill-amber' : 'pill-green') : 'pill-red'">
            {{ p.inStock ? (p.count <= 5 ? t('shop.left', { n: p.count }) : t('shop.inStock')) : t('shop.soldOut') }}
          </span>
        </div>
        <h3 class="tile-name">{{ p.name }}</h3>
        <div class="tile-foot">
          <span class="price num">{{ money(p.sellingPrice) }}</span>
          <div v-if="cart.qtyOf(p.id) > 0" class="stepper">
            <button @click="dec(p)" aria-label="Less">–</button>
            <span class="num">{{ cart.qtyOf(p.id) }}</span>
            <button @click="inc(p)" :disabled="cart.qtyOf(p.id) >= p.count" aria-label="More">+</button>
          </div>
          <button v-else class="add" :disabled="!p.inStock" @click="add(p)">{{ t('shop.add') }}</button>
        </div>
      </article>
    </div>

    <!-- Sticky cart bar (thumb zone) -->
    <transition name="rise">
      <button v-if="!cart.isEmpty" class="cartbar" @click="sheetOpen = true">
        <span class="cart-count num">{{ cart.count }}</span>
        <span class="cart-label">{{ t('shop.viewCart') }}</span>
        <span class="cart-total num">{{ money(cart.total) }}</span>
      </button>
    </transition>

    <!-- Cart bottom sheet -->
    <transition name="sheet">
      <div v-if="sheetOpen" class="overlay" @click.self="sheetOpen = false">
        <div class="sheet">
          <div class="grip"></div>
          <h3 class="sheet-title">{{ t('shop.yourCart') }}</h3>
          <div class="lines">
            <div v-for="l in cart.items" :key="l.product.id" class="line">
              <div class="line-info">
                <div class="line-name">{{ l.product.name }}</div>
                <div class="line-price num">{{ money(l.product.sellingPrice) }} {{ t('shop.each') }}</div>
              </div>
              <div class="stepper">
                <button @click="dec(l.product)">–</button>
                <span class="num">{{ l.quantity }}</span>
                <button @click="inc(l.product)" :disabled="l.quantity >= l.product.count">+</button>
              </div>
            </div>
          </div>
          <div class="sheet-total">
            <span>{{ t('common.total') }}</span>
            <span class="num big">{{ money(cart.total) }}</span>
          </div>
          <button class="btn btn-primary btn-block" @click="startCheckout">{{ t('shop.checkout') }}</button>
        </div>
      </div>
    </transition>

    <!-- Checkout sheet -->
    <transition name="sheet">
      <div v-if="checkoutOpen" class="overlay" @click.self="checkoutOpen = false">
        <div class="sheet">
          <div class="grip"></div>
          <h3 class="sheet-title">{{ t('shop.confirmOrder') }}</h3>

          <div v-if="auth.isLoggedIn" class="as-member">
            {{ t('shop.orderingAs', { name: `${auth.customer.name} ${auth.customer.surname}` }) }}
          </div>
          <div v-else class="guest-field">
            <label>{{ t('shop.nameLabel') }}</label>
            <div class="combo" :class="{ open: comboOpen && filteredMembers.length }">
              <input
                v-model="memberQuery"
                class="combo-input"
                :class="{ picked: selectedMember }"
                :placeholder="t('shop.namePlaceholder')"
                autocomplete="off"
                @focus="comboOpen = true"
                @input="onComboInput"
                @blur="comboOpen = false"
              />
              <span v-if="selectedMember" class="combo-check">✓</span>
              <ul v-if="comboOpen && filteredMembers.length" class="combo-list">
                <li v-for="m in filteredMembers" :key="m.id" class="combo-opt" @mousedown.prevent="pickMember(m)">
                  {{ m.name }}
                </li>
              </ul>
              <p v-if="comboOpen && memberQuery && !filteredMembers.length" class="combo-empty">
                {{ t('shop.noMatch', { q: memberQuery }) }}
              </p>
            </div>
            <p class="micro">{{ t('shop.nameHint') }}</p>
          </div>

          <div class="sheet-total">
            <span>{{ t('shop.itemsCount', cart.count) }}</span>
            <span class="num big">{{ money(cart.total) }}</span>
          </div>
          <button class="btn btn-primary btn-block" :disabled="placing || (!auth.isLoggedIn && !selectedMember)" @click="placeOrder">
            {{ placing ? t('shop.placing') : t('shop.placeOrder') }}
          </button>
          <button class="btn btn-ghost btn-block back-btn" @click="checkoutOpen = false; sheetOpen = true">{{ t('shop.backToCart') }}</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.shop { min-height: 100vh; padding-bottom: calc(120px + var(--sab)); }
.bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; padding: calc(12px + var(--sat)) 18px 12px; background: var(--chalk); }
.icon-btn { width: 42px; height: 42px; border-radius: 12px; background: var(--paper); border: 1.5px solid var(--line); font-size: 18px; display: grid; place-items: center; color: var(--txt); }
.balance-chip {
  display: inline-flex; align-items: center; height: 42px; padding: 0 14px; border-radius: 12px;
  font-weight: 800; font-size: 15px; text-decoration: none; white-space: nowrap;
  background: #e8f5ec; color: #1a7f4b; border: 1.5px solid #cfe9d8;
}
.balance-chip.neg { background: #fdecec; color: var(--red); border-color: #f3d3d4; }
.bar-title { flex: 1; }
.bar-title h2 { font-size: 24px; font-weight: 900; }

.search-wrap { padding: 4px 18px 12px; position: sticky; top: calc(66px + var(--sat)); z-index: 19; background: var(--chalk); }

.state { text-align: center; color: var(--txt-faint); padding: 60px 20px; }

.mship-warn {
  display: flex; align-items: center; gap: 10px;
  margin: 0 18px 12px; padding: 12px 14px; border-radius: 12px;
  font-weight: 700; font-size: 13.5px; line-height: 1.4;
}
.mship-warn.expired { background: #fdecec; color: var(--red); border: 1.5px solid #f3d3d4; }
.mship-chip {
  display: inline-flex; align-items: center; gap: 5px; height: 42px; padding: 0 12px;
  border-radius: 12px; white-space: nowrap; font-weight: 800; font-size: 13px;
  background: #fdf3e2; color: #8a5a10; border: 1.5px solid #f3ddb5;
}

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 4px 18px; }
.tile { background: var(--paper); border: 1.5px solid var(--line); border-radius: var(--r-lg); padding: 16px; display: flex; flex-direction: column; min-height: 150px; box-shadow: var(--shadow); }
.tile.out { opacity: 0.6; }
.tile.featured { border-color: var(--orange); }
.tile-top { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.tile-top .star { color: var(--orange); font-size: 16px; line-height: 1; }
.tile-name { font-size: 16px; font-weight: 800; line-height: 1.2; flex: 1; }
.tile-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; }
.price { font-size: 18px; font-weight: 700; }
.add { background: var(--ink); color: #fff; border-radius: 11px; padding: 9px 16px; font-weight: 800; font-size: 14px; min-height: 40px; }
.add:disabled { opacity: 0.4; }

.stepper { display: inline-flex; align-items: center; gap: 0; background: var(--chalk); border-radius: 11px; border: 1.5px solid var(--line); overflow: hidden; }
.stepper button { width: 36px; height: 40px; font-size: 20px; font-weight: 700; color: var(--ink); display: grid; place-items: center; }
.stepper button:disabled { opacity: 0.3; }
.stepper span { min-width: 26px; text-align: center; font-weight: 700; font-size: 15px; }

.cartbar {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(18px + var(--sab));
  width: calc(100% - 36px); max-width: 484px; z-index: 30;
  display: flex; align-items: center; gap: 14px; padding: 16px 20px;
  background: var(--orange); color: #fff; border-radius: 16px; box-shadow: var(--shadow-pop);
  font-weight: 800; font-size: 16px;
}
.cart-count { background: rgba(255,255,255,0.25); border-radius: 9px; padding: 4px 10px; font-size: 15px; }
.cart-label { flex: 1; text-align: left; }
.cart-total { font-size: 18px; }

.overlay { position: fixed; inset: 0; background: rgba(21,23,28,0.5); z-index: 50; display: flex; align-items: flex-end; }
.sheet { width: 100%; max-width: 520px; margin: 0 auto; background: var(--paper); border-radius: 26px 26px 0 0; padding: 12px 20px calc(24px + var(--sab)); box-shadow: var(--shadow-pop); max-height: 86vh; overflow-y: auto; }
.grip { width: 44px; height: 5px; border-radius: 999px; background: var(--line); margin: 4px auto 14px; }
.sheet-title { font-size: 22px; font-weight: 900; margin-bottom: 16px; }
.lines { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.line { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.line-name { font-weight: 700; font-size: 15px; }
.line-price { font-size: 12.5px; color: var(--txt-faint); margin-top: 2px; }
.sheet-total { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; font-weight: 700; font-size: 16px; }
.sheet-total .big { font-size: 26px; }
.as-member { background: var(--chalk); border-radius: 12px; padding: 14px 16px; font-size: 15px; margin-bottom: 4px; }
.guest-field { margin-bottom: 4px; }
.micro { font-size: 12px; color: var(--txt-faint); margin: 8px 0 0; }

.combo { position: relative; }
.combo-input.picked { border-color: var(--green); padding-right: 42px; }
.combo-check { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--green); font-weight: 800; font-size: 18px; }
.combo-list {
  list-style: none; margin: 8px 0 0; padding: 6px; max-height: 220px; overflow-y: auto;
  background: var(--paper); border: 1.5px solid var(--line); border-radius: 14px; box-shadow: var(--shadow);
  position: absolute; left: 0; right: 0; bottom: calc(100% + 8px); z-index: 5;
}
.combo-opt { padding: 13px 14px; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; }
.combo-opt:active, .combo-opt:hover { background: var(--chalk); }
.combo-empty { font-size: 13px; color: var(--red); margin: 8px 2px 0; font-weight: 600; }
.back-btn { margin-top: 10px; }

.rise-enter-active, .rise-leave-active { transition: transform 0.22s ease, opacity 0.22s; }
.rise-enter-from, .rise-leave-to { transform: translate(-50%, 80px); opacity: 0; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.2s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.24s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>
