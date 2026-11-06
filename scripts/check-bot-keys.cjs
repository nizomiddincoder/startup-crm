const fs = require("fs");
const s = fs.readFileSync("lib/i18n/uz.ts", "utf8");
const keys = [
  "notCustomer","chooseShop","myOrdersEmpty","myPurchasesEmpty","pointsLine","added","submitted",
  "cartCleared","cartTitle","cartTotal","cartLine","addMore","clearCart","submit","products",
  "chooseCategory","noProducts","prev","next","otherCategory","backToCategories","cartButton",
  "orderExpired","newOrderStaff","myPurchaseLine","orderAccepted","orderReady","orderCancelled",
];
const botStart = s.indexOf("  bot: {");
const botEnd = s.indexOf("\n  ", botStart + 10);
const bot = s.slice(botStart, botEnd);
const missing = keys.filter((k) => !new RegExp("^    " + k + ":", "m").test(bot));
console.log(missing.length ? "MISSING: " + missing.join(",") : "ALL BOT KEYS OK");
console.log("statuses:", /statuses:/.test(s));
