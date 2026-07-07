import { createI18n } from "vue-i18n";

const STORAGE_KEY = "gym_lang";

const messages = {
  tr: {
    home: {
      eyebrow: "Spor salonu mağazası",
      title: "İhtiyacın olanı kap.",
      tagline: "Protein, ekipman ve atıştırmalık — salonun içinden saniyeler içinde al.",
      welcome: "Tekrar hoş geldin",
      openShop: "Mağazayı aç",
      openShopSub: "Oturumun açık kalır — tekrar giriş yok",
      account: "Hesabım",
      accountSub: "Satın alma geçmişi ve çıkış",
      quickBuy: "Hızlı al",
      quickBuySub: "Giriş yok — sadece üye listesindeki adın",
      login: "Üye girişi",
      loginSub: "Kalıcı oturum · daha hızlı ödeme"
    },
    shop: {
      quickBuy: "Hızlı al",
      title: "Mağaza",
      balance: "Bakiye",
      search: "Ürün ara…",
      loading: "Ürünler yükleniyor…",
      empty: "Ürün bulunamadı.",
      inStock: "Stokta",
      left: "{n} kaldı",
      soldOut: "Tükendi",
      add: "Ekle",
      viewCart: "Sepeti gör",
      yourCart: "Sepetin",
      each: "adet",
      checkout: "Ödemeye geç",
      confirmOrder: "Siparişi onayla",
      orderingAs: "Şu üye olarak: {name}",
      nameLabel: "Adın (üye listesinden seç)",
      namePlaceholder: "Adını aratmak için yaz…",
      noMatch: "“{q}” ile eşleşen üye yok. Resepsiyona danış.",
      nameHint: "Yazmaya başla — adını seç ki birebir eşleşsin.",
      itemsCount: "{count} ürün",
      placeOrder: "Siparişi ver",
      placing: "Veriliyor…",
      backToCart: "Sepete dön",
      onlyLeft: "{name} ürününden sadece {n} adet var.",
      orderPlaced: "Sipariş verildi — {total}. Afiyet olsun! 💪",
      selectName: "Üye listesinden adını seç.",
      loadFailed: "Ürünler yüklenemedi.",
      checkoutFailed: "Ödeme başarısız."
    },
    login: {
      eyebrow: "Üye girişi",
      title: "Tekrar hoş geldin",
      sub: "Bir kez gir — seni kalıcı olarak giriş yapmış tutarız.",
      memberId: "Üye ID",
      idPlaceholder: "ID'n",
      password: "Şifre",
      signIn: "Giriş yap",
      signingIn: "Giriş yapılıyor…",
      noLogin: "Girişin yok mu? Misafir olarak al →",
      failed: "Giriş başarısız."
    },
    account: {
      title: "Hesap",
      logout: "Çıkış",
      history: "Satın alma geçmişi",
      orders: "{n} sipariş · {total}",
      from: "Başlangıç",
      to: "Bitiş",
      loading: "Yükleniyor…",
      empty: "Bu aralıkta satın alma yok.",
      loadFailed: "Geçmiş yüklenemedi.",
      membership: "Üyelik",
      until: "→ {date}",
      daysLeft: "{n} gün kaldı",
      expired: "Süresi doldu"
    },
    common: { back: "Geri", total: "Toplam" }
  },
  en: {
    home: {
      eyebrow: "The gym shop",
      title: "Grab what you need.",
      tagline: "Protein, gear and snacks — buy in seconds, right from the floor.",
      welcome: "Welcome back",
      openShop: "Open shop",
      openShopSub: "Your session stays open — no re-login",
      account: "My account",
      accountSub: "Purchase history & logout",
      quickBuy: "Quick buy",
      quickBuySub: "No login — just your name from the member list",
      login: "Member login",
      loginSub: "Stay signed in for good · faster checkout"
    },
    shop: {
      quickBuy: "Quick buy",
      title: "Shop",
      balance: "Balance",
      search: "Search products…",
      loading: "Loading products…",
      empty: "No products found.",
      inStock: "In stock",
      left: "{n} left",
      soldOut: "Sold out",
      add: "Add",
      viewCart: "View cart",
      yourCart: "Your cart",
      each: "each",
      checkout: "Checkout",
      confirmOrder: "Confirm order",
      orderingAs: "Ordering as {name}",
      nameLabel: "Your name (pick from the member list)",
      namePlaceholder: "Type to search your name…",
      noMatch: "No member matches “{q}”. Ask the front desk.",
      nameHint: "Start typing — choose your name so it's matched exactly.",
      itemsCount: "{count} item | {count} items",
      placeOrder: "Place order",
      placing: "Placing…",
      backToCart: "Back to cart",
      onlyLeft: "Only {n} of {name} in stock.",
      orderPlaced: "Order placed — {total}. Enjoy! 💪",
      selectName: "Select your name from the member list.",
      loadFailed: "Couldn't load products.",
      checkoutFailed: "Checkout failed."
    },
    login: {
      eyebrow: "Member login",
      title: "Welcome back",
      sub: "Sign in once — we'll keep you logged in for good.",
      memberId: "Member ID",
      idPlaceholder: "your ID",
      password: "Password",
      signIn: "Sign in",
      signingIn: "Signing in…",
      noLogin: "Don't have a login? Buy as guest →",
      failed: "Login failed."
    },
    account: {
      title: "Account",
      logout: "Log out",
      history: "Purchase history",
      orders: "{n} orders · {total}",
      from: "From",
      to: "To",
      loading: "Loading…",
      empty: "No purchases in this range.",
      loadFailed: "Couldn't load history.",
      membership: "Membership",
      until: "→ {date}",
      daysLeft: "{n} days left",
      expired: "Expired"
    },
    common: { back: "Back", total: "Total" }
  }
};

const saved = localStorage.getItem(STORAGE_KEY);
const initial = saved === "en" || saved === "tr" ? saved : "tr"; // default Turkish

export const i18n = createI18n({
  legacy: false,
  locale: initial,
  fallbackLocale: "en",
  messages
});

document.documentElement.lang = initial;

export function setLocale(lang) {
  i18n.global.locale.value = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
}
