import { createI18n } from "vue-i18n";

const STORAGE_KEY = "gym_admin_lang";

const messages = {
  tr: {
    nav: { dashboard: "Panel", stock: "Stok", members: "Üyeler", sales: "Satışlar", reports: "Raporlar", brandSub: "Stok kontrol", signOut: "Çıkış" },
    login: {
      eyebrow: "Yönetici erişimi", title: "Panele giriş yap", lead: "Stok, üye ve satış raporlarını yönet.",
      tagline: "Her tekrar sayılır. Raftaki her ürün de.",
      username: "Kullanıcı adı", password: "Şifre", signIn: "Giriş yap", signingIn: "Giriş yapılıyor…",
      hint: "Kurulum sonrası varsayılan:", failed: "Giriş başarısız."
    },
    dash: {
      eyebrow: "Genel bakış", title: "Panel",
      revenueMonth: "Gelir · bu ay", profitMonth: "Kâr · bu ay", unitsMonth: "Satılan adet · ay", activeProducts: "Aktif ürün",
      salesN: "{n} satış", thisWeek: "{v} bu hafta", pcs: "adet", membersN: "{n} üye",
      topSellers: "En çok satanlar", noSales: "Henüz satış yok. Burada görünecekler.",
      lowStock: "Düşük stok", wellStocked: "Her şey yeterli stokta. 💪", leftN: "{n} kaldı",
      expiring: "Üyeliği yaklaşanlar", noneExpiring: "Yaklaşan üyelik bitişi yok. 🎉", daysLeftN: "{n} gün", expiredPill: "Süresi doldu",
      inventoryValue: "Envanter değeri (maliyet)", viewReports: "Raporları gör →", loadFailed: "Panel yüklenemedi."
    },
    stock: {
      eyebrow: "Envanter", title: "Stok", add: "+ Ürün ekle",
      buyingHint: "💡 Haftalık ve aylık raporlarda kâr görmek için ürünlere bir alış fiyatı ekle.",
      search: "Ürün ara…",
      colProduct: "Ürün", colCount: "Adet", colBuying: "Alış", colSelling: "Satış", colMargin: "Marj",
      loading: "Yükleniyor…", empty: "Henüz ürün yok. Liste içe aktar veya bir ürün ekle.",
      edit: "Düzenle", remove: "Kaldır",
      addTitle: "Ürün ekle", editTitle: "Ürünü düzenle",
      fName: "Ürün adı", fCount: "Adet", fSelling: "Satış fiyatı (₺)", fBuying: "Alış fiyatı (₺) — opsiyonel", fBuyingPh: "Kârı takip etmemek için boş bırak",
      cancel: "İptal", save: "Değişiklikleri kaydet", create: "Ürün ekle",
      saved: "Ürün güncellendi.", added: "Ürün eklendi.", removeConfirm: "{name} mağazadan kaldırılsın mı?", removed: "Ürün kaldırıldı.",
      loadFailed: "Stok yüklenemedi.", saveFailed: "Ürün kaydedilemedi.", removeFailed: "Ürün kaldırılamadı."
    },
    members: {
      eyebrow: "Kişiler", title: "Üyeler", export: "↓ Dışa aktar", add: "+ Üye ekle",
      search: "Ada, ID'ye veya telefona göre ara…",
      colId: "ID", colName: "Ad", colSince: "Üyelik", colOverall: "Toplam", colBalance: "Bakiye", colStatus: "Durum",
      noPhone: "telefon yok", overdueAmt: "{v} gecikmiş",
      pay: "Öde", sales: "Satışlar", edit: "Düzenle", del: "Sil",
      loading: "Yükleniyor…", empty: "Henüz üye yok. Liste içe aktar veya bir üye ekle.",
      addTitle: "Üye ekle", editTitle: "Üyeyi düzenle",
      fLoginId: "Giriş ID", fNewPass: "Yeni şifre (opsiyonel)", fPass: "Şifre", fPassKeep: "Aynı kalsın diye boş bırak",
      fName: "Ad", fSurname: "Soyad", fPhone: "Telefon — opsiyonel", fStart: "Üyelik başlangıcı — opsiyonel",
      cancel: "İptal", save: "Değişiklikleri kaydet", create: "Üye ekle",
      payTitle: "Ödeme al — {name}", overallSpent: "Toplam harcama", outstanding: "Kalan bakiye",
      amount: "Tutar (₺)", note: "Not — opsiyonel", notePh: "ör. Haziran yenileme", history: "Ödeme geçmişi",
      recordPayment: "Ödemeyi kaydet",
      added: "Üye eklendi.", saved: "Üye güncellendi.", delConfirm: "{name} silinsin mi? Ödemeleri de silinir.", deleted: "Üye silindi.",
      paid: "Ödeme kaydedildi — {v}.", payAmtErr: "0'dan büyük bir tutar gir.", delPayConfirm: "Bu ödeme silinsin mi?",
      until: "→ {date}", expired: "Süresi doldu", daysLeft: "{n} gün kaldı",
      renew: "{month} ödemesini al", renewConfirm: "{name} — {month} ödemesi alındı olarak işaretlensin mi? Üyelik 30 gün uzatılır.",
      renewed: "Üyelik uzatıldı — yeni bitiş: {date}.", renewFailed: "Üyelik uzatılamadı.",
      revertRenew: "Geri al", revertRenewConfirm: "{name} — son 30 günlük uzatma geri alınsın mı? Yeni bitiş tarihi: {date}.",
      revertRenewed: "Uzatma geri alındı — yeni bitiş: {date}.", revertRenewFailed: "Uzatma geri alınamadı.",
      confirmTitle: "Onay", confirm: "Onayla",
      loadFailed: "Üyeler yüklenemedi.", saveFailed: "Üye kaydedilemedi.", delFailed: "Üye silinemedi.",
      payFailed: "Ödeme kaydedilemedi.", delPayFailed: "Ödeme silinemedi.", exportFailed: "Dışa aktarma başarısız.", exported: "Üyeler dışa aktarıldı.", updateFailed: "Güncellenemedi."
    },
    sales: {
      eyebrow: "Hareketler", title: "Satışlar", export: "↓ Excel'e aktar",
      filteredBy: "Üyeye göre filtreli", overall: "Toplam", balance: "Bakiye", recordPayment: "Ödeme al", clear: "Temizle ✕",
      member: "Üye", allMembers: "Tüm üyeler", searchMember: "Üye ara…", noMatch: "\"{q}\" ile eşleşen üye yok", from: "Başlangıç", to: "Bitiş", resetDates: "Tarihleri sıfırla",
      typeAll: "Tümü", typeSales: "Satışlar", typePayments: "Ödemeler",
      paymentLabel: "Ödeme", collected: "tahsilat",
      countSales: "satış", countUnits: "adet",
      colWhen: "Zaman", colMember: "Üye", colItems: "Ürünler", colVia: "Kanal", colTotal: "Tutar",
      loading: "Yükleniyor…", empty: "Bu filtrelere uygun satış yok.",
      payTitle: "Ödeme al — {name}", overallSpent: "Toplam harcama", outstanding: "Kalan bakiye",
      amount: "Tutar (₺)", note: "Not — opsiyonel", notePh: "ör. Haziran yenileme", history: "Ödeme geçmişi", cancel: "İptal",
      paid: "Ödeme kaydedildi — {v}.", payAmtErr: "0'dan büyük bir tutar gir.", delPayConfirm: "Bu ödeme silinsin mi?",
      loadFailed: "Satışlar yüklenemedi.", exportFailed: "Dışa aktarma başarısız.", exported: "Satışlar dışa aktarıldı.",
      payFailed: "Ödeme kaydedilemedi.", delPayFailed: "Ödeme silinemedi.",
      revert: "Geri al", revertConfirm: "{name} — {v} tutarındaki sipariş geri alınsın mı? Ürünler stoğa iade edilir ve satış silinir.",
      reverted: "Sipariş geri alındı — ürünler stoğa iade edildi.", revertFailed: "Sipariş geri alınamadı."
    },
    reports: {
      eyebrow: "Performans", title: "Raporlar", weekly: "Haftalık", monthly: "Aylık",
      profitHint: "💡 Kâr henüz takip edilmiyor. Kâr ve marjı görmek için stoğa alış fiyatları ekle.",
      revenue: "Gelir", profit: "Kâr", units: "Satılan adet",
      last12w: "son 12 hafta", last12m: "son 12 ay", afterCogs: "mal maliyeti sonrası", ordersN: "{n} sipariş",
      mRevenue: "Gelir", mProfit: "Kâr", mUnits: "Adet",
      legendRevenue: "Gelir", legendProfit: "Kâr",
      soldNotPaid: "Satıldı · ödenmedi", overdue: "Gecikmiş", totalOutstanding: "toplam kalan bakiye", unpaidPrev: "geçmiş aylardan ödenmemiş",
      membersToChase: "Takip edilecek üyeler", overdueFirst: "önce gecikmişler", allPaid: "Herkes ödemiş. 🎉",
      colMember: "Üye", colStatus: "Durum", colOverdue: "Gecikmiş", colBalance: "Bakiye",
      oldestUnpaid: "{date} en eski ödenmemiş", salesArrow: "Satışlar →",
      loadFailed: "Rapor yüklenemedi.", recLoadFailed: "Tahsilat yüklenemedi."
    },
    status: { clean: "Temiz", owing: "Borçlu", overdue: "Gecikmiş", credit: "Alacaklı" },
    imp: {
      eyebrow: "Excel içe aktar", upload: "{noun} listesi yükle", member: "Üye", stock: "Stok",
      template: "↓ Şablon",
      note: "Şablonu indir, doldur, sonra .xlsx dosyasını buraya yükle. Zorunlu kolonlar Guide sayfasında işaretli.",
      choose: "Dosya seç…", import: "İçe aktar", importing: "Aktarılıyor…",
      replace: "Tüm listeyi değiştir (yoksa mevcut satırlar güncellenir, yeniler eklenir)",
      added: "{n} eklendi", updated: "{n} güncellendi", skipped: "{n} atlandı", andMore: "…ve {n} tane daha",
      tplDownloaded: "Şablon indirildi.", tplFailed: "Şablon indirilemedi.",
      importedToast: "İçe aktarıldı — {created} eklendi, {updated} güncellendi.", importFailed: "İçe aktarma başarısız.",
      conflictTitle: "{n} ID zaten kayıtlı",
      conflictNote: "Dosyadaki şu ID'ler mevcut üyelerle eşleşiyor. Devam edersen bu üyelerin bilgileri dosyadaki satırlarla güncellenir.",
      conflictConfirm: "Güncelle ve devam et", conflictCancel: "Vazgeç"
    },
    settings: {
      eyebrow: "Hesap", title: "Ayarlar",
      profile: "Profil bilgileri", username: "Kullanıcı adı",
      changePassword: "Şifre değiştir",
      passwordHint: "Şifreni değiştirmek istemiyorsan bu alanları boş bırak.",
      currentPassword: "Mevcut şifre", newPassword: "Yeni şifre", confirmPassword: "Yeni şifre (tekrar)",
      save: "Değişiklikleri kaydet", saving: "Kaydediliyor…", saved: "Profil güncellendi.",
      storefront: "Mağaza",
      showBalance: "Üyeye bakiyesini göster",
      showBalanceHint: "Açıkken üye mağazaya girdiğinde bakiyesi başlıkta görünür.",
      settingSaved: "Ayar kaydedildi.", settingFailed: "Ayar kaydedilemedi.",
      errUsername: "Kullanıcı adı boş olamaz.",
      errCurrentRequired: "Şifreyi değiştirmek için mevcut şifreni gir.",
      errMismatch: "Yeni şifreler eşleşmiyor.",
      errNothing: "Değiştirilecek bir şey yok.",
      saveFailed: "Profil kaydedilemedi."
    },
    common: { loading: "Yükleniyor…" }
  },
  en: {
    nav: { dashboard: "Dashboard", stock: "Stock", members: "Members", sales: "Sales", reports: "Reports", brandSub: "Stock control", signOut: "Sign out" },
    login: {
      eyebrow: "Admin access", title: "Sign in to the panel", lead: "Manage stock, members and sales reports.",
      tagline: "Every rep counts. So does every unit on the shelf.",
      username: "Username", password: "Password", signIn: "Sign in", signingIn: "Signing in…",
      hint: "Default after setup:", failed: "Sign in failed."
    },
    dash: {
      eyebrow: "Overview", title: "Dashboard",
      revenueMonth: "Revenue · this month", profitMonth: "Profit · this month", unitsMonth: "Units sold · month", activeProducts: "Active products",
      salesN: "{n} sales", thisWeek: "{v} this week", pcs: "pcs", membersN: "{n} members",
      topSellers: "Top sellers", noSales: "No sales recorded yet. They'll show up here.",
      lowStock: "Low stock", wellStocked: "Everything's well stocked. 💪", leftN: "{n} left",
      expiring: "Expiring memberships", noneExpiring: "No memberships ending soon. 🎉", daysLeftN: "{n} days", expiredPill: "Expired",
      inventoryValue: "Inventory value (at cost)", viewReports: "View reports →", loadFailed: "Could not load the dashboard."
    },
    stock: {
      eyebrow: "Inventory", title: "Stock", add: "+ Add product",
      buyingHint: "💡 Add a buying price to products to unlock profit figures in the weekly & monthly reports.",
      search: "Search products…",
      colProduct: "Product", colCount: "Count", colBuying: "Buying", colSelling: "Selling", colMargin: "Margin",
      loading: "Loading…", empty: "No products yet. Import a list or add one.",
      edit: "Edit", remove: "Remove",
      addTitle: "Add product", editTitle: "Edit product",
      fName: "Product name", fCount: "Count", fSelling: "Selling price (₺)", fBuying: "Buying price (₺) — optional", fBuyingPh: "Leave empty to skip profit tracking",
      cancel: "Cancel", save: "Save changes", create: "Add product",
      saved: "Product updated.", added: "Product added.", removeConfirm: "Remove {name} from the storefront?", removed: "Product removed.",
      loadFailed: "Could not load stock.", saveFailed: "Could not save the product.", removeFailed: "Could not remove the product."
    },
    members: {
      eyebrow: "People", title: "Members", export: "↓ Export", add: "+ Add member",
      search: "Search by name, ID or phone…",
      colId: "ID", colName: "Name", colSince: "Member since", colOverall: "Overall", colBalance: "Balance", colStatus: "Status",
      noPhone: "no phone", overdueAmt: "{v} overdue",
      pay: "Pay", sales: "Sales", edit: "Edit", del: "Del",
      loading: "Loading…", empty: "No members yet. Import a list or add one.",
      addTitle: "Add member", editTitle: "Edit member",
      fLoginId: "Login ID", fNewPass: "New password (optional)", fPass: "Password", fPassKeep: "Leave empty to keep",
      fName: "Name", fSurname: "Surname", fPhone: "Telephone — optional", fStart: "Membership start — optional",
      cancel: "Cancel", save: "Save changes", create: "Add member",
      payTitle: "Record payment — {name}", overallSpent: "Overall spent", outstanding: "Outstanding",
      amount: "Amount (₺)", note: "Note — optional", notePh: "e.g. June renewal", history: "Payment history",
      recordPayment: "Record payment",
      added: "Member added.", saved: "Member updated.", delConfirm: "Delete {name}? This removes their payments too.", deleted: "Member deleted.",
      paid: "Payment recorded — {v}.", payAmtErr: "Enter an amount greater than 0.", delPayConfirm: "Delete this payment?",
      until: "→ {date}", expired: "Expired", daysLeft: "{n} days left",
      renew: "Collect {month} payment", renewConfirm: "{name} — mark the {month} payment as collected? The membership is extended by 30 days.",
      renewed: "Membership extended — new end date: {date}.", renewFailed: "Could not extend the membership.",
      revertRenew: "Undo", revertRenewConfirm: "{name} — undo the last 30-day extension? New end date: {date}.",
      revertRenewed: "Extension undone — new end date: {date}.", revertRenewFailed: "Could not undo the extension.",
      confirmTitle: "Confirm", confirm: "Approve",
      loadFailed: "Could not load members.", saveFailed: "Could not save the member.", delFailed: "Could not delete the member.",
      payFailed: "Could not record the payment.", delPayFailed: "Could not delete payment.", exportFailed: "Export failed.", exported: "Members exported.", updateFailed: "Could not update."
    },
    sales: {
      eyebrow: "Activity", title: "Sales", export: "↓ Export Excel",
      filteredBy: "Filtered by member", overall: "Overall", balance: "Balance", recordPayment: "Record payment", clear: "Clear ✕",
      member: "Member", allMembers: "All members", searchMember: "Search member…", noMatch: "No member matches \"{q}\"", from: "From", to: "To", resetDates: "Reset dates",
      typeAll: "All", typeSales: "Sales", typePayments: "Payments",
      paymentLabel: "Payment", collected: "collected",
      countSales: "sales", countUnits: "units",
      colWhen: "When", colMember: "Member", colItems: "Items", colVia: "Via", colTotal: "Total",
      loading: "Loading…", empty: "No sales for these filters.",
      payTitle: "Record payment — {name}", overallSpent: "Overall spent", outstanding: "Outstanding",
      amount: "Amount (₺)", note: "Note — optional", notePh: "e.g. June renewal", history: "Payment history", cancel: "Cancel",
      paid: "Payment recorded — {v}.", payAmtErr: "Enter an amount greater than 0.", delPayConfirm: "Delete this payment?",
      loadFailed: "Could not load sales.", exportFailed: "Export failed.", exported: "Sales exported.",
      payFailed: "Could not record the payment.", delPayFailed: "Could not delete payment.",
      revert: "Revert", revertConfirm: "Revert this order — {name}, {v}? Items go back into stock and the sale is removed.",
      reverted: "Order reverted — items returned to stock.", revertFailed: "Could not revert the order."
    },
    reports: {
      eyebrow: "Performance", title: "Reports", weekly: "Weekly", monthly: "Monthly",
      profitHint: "💡 Profit isn't tracked yet. Add buying prices to your stock to see profit and margins here.",
      revenue: "Revenue", profit: "Profit", units: "Units sold",
      last12w: "last 12 weeks", last12m: "last 12 months", afterCogs: "after cost of goods", ordersN: "{n} orders",
      mRevenue: "Revenue", mProfit: "Profit", mUnits: "Units",
      legendRevenue: "Revenue", legendProfit: "Profit",
      soldNotPaid: "Sold · not paid", overdue: "Overdue", totalOutstanding: "total outstanding balance", unpaidPrev: "unpaid from previous months",
      membersToChase: "Members to chase", overdueFirst: "overdue first", allPaid: "Everyone's paid up. 🎉",
      colMember: "Member", colStatus: "Status", colOverdue: "Overdue", colBalance: "Balance",
      oldestUnpaid: "since {date} oldest unpaid", salesArrow: "Sales →",
      loadFailed: "Could not load the report.", recLoadFailed: "Could not load receivables."
    },
    status: { clean: "Clean", owing: "Owing", overdue: "Overdue", credit: "Credit" },
    imp: {
      eyebrow: "Excel import", upload: "Upload {noun} list", member: "member", stock: "stock",
      template: "↓ Template",
      note: "Download the template, fill it in, then upload the .xlsx here. Required columns are marked in the Guide sheet.",
      choose: "Choose file…", import: "Import", importing: "Importing…",
      replace: "Replace the whole list (otherwise existing rows are updated, new ones added)",
      added: "{n} added", updated: "{n} updated", skipped: "{n} skipped", andMore: "…and {n} more",
      tplDownloaded: "Template downloaded.", tplFailed: "Could not download the template.",
      importedToast: "Imported — {created} added, {updated} updated.", importFailed: "Import failed.",
      conflictTitle: "{n} IDs already exist",
      conflictNote: "These IDs in the file match existing members. If you continue, those members will be updated with the rows from the file.",
      conflictConfirm: "Update and continue", conflictCancel: "Cancel"
    },
    settings: {
      eyebrow: "Account", title: "Settings",
      profile: "Profile details", username: "Username",
      changePassword: "Change password",
      passwordHint: "Leave these blank if you don't want to change your password.",
      currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password",
      save: "Save changes", saving: "Saving…", saved: "Profile updated.",
      storefront: "Storefront",
      showBalance: "Show members their balance",
      showBalanceHint: "When on, a member sees their balance in the shop header.",
      settingSaved: "Setting saved.", settingFailed: "Couldn't save the setting.",
      errUsername: "Username can't be empty.",
      errCurrentRequired: "Enter your current password to change it.",
      errMismatch: "New passwords don't match.",
      errNothing: "Nothing to change.",
      saveFailed: "Couldn't save your profile."
    },
    common: { loading: "Loading…" }
  }
};

const saved = localStorage.getItem(STORAGE_KEY);
const initial = saved === "en" || saved === "tr" ? saved : "tr";

export const i18n = createI18n({ legacy: false, locale: initial, fallbackLocale: "en", messages });
document.documentElement.lang = initial;

export function setLocale(lang) {
  i18n.global.locale.value = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
}
