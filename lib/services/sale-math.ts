/**
 * Kassa hisob-kitobi: miqdor, qator summasi, chegirma, to'lov va qaytim.
 * Brauzerda (savatcha) ham, serverda (sotuvni saqlash) ham AYNAN shu funksiyalar ishlatiladi,
 * shuning uchun ekrandagi summa va bazadagi summa hech qachon farq qilmaydi.
 *
 * Miqdor — Decimal (decimal.js), JS number bilan hisoblanmaydi. Pul — butun so'm.
 */
import Decimal from "decimal.js";
import { uz } from "@/lib/i18n/uz";
import type { UnitValue } from "@/lib/validation/product";

/** Faqat butun songa sotiladigan birliklar (yarim qop sement sotilmaydi). */
export const DISCRETE_UNITS: ReadonlySet<UnitValue> = new Set([
  "PIECE",
  "BAG",
  "PACK",
  "SHEET",
  "ROLL",
]);

export const MAX_QUANTITY = new Decimal(1_000_000);
const QUANTITY_DECIMALS = 3;

export type QuantityResult = { ok: true; value: Decimal } | { ok: false; error: string };

/**
 * "1,5" yoki "1.5" → 1.5. Birlikka qarab butun son talab qilinadi.
 * `allowZero` — inventarizatsiya uchun (sanalganda mahsulot umuman qolmagan bo'lishi mumkin).
 */
export function parseQuantity(
  input: string | number | Decimal,
  unit: UnitValue,
  { allowZero = false }: { allowZero?: boolean } = {},
): QuantityResult {
  let value: Decimal;
  try {
    value = new Decimal(typeof input === "string" ? input.trim().replace(",", ".") : input);
  } catch {
    return { ok: false, error: uz.pos.invalidQuantity };
  }
  if (!value.isFinite() || value.lt(0) || (value.isZero() && !allowZero)) {
    return { ok: false, error: uz.pos.invalidQuantity };
  }
  if (value.gt(MAX_QUANTITY)) return { ok: false, error: uz.pos.quantityTooLarge };
  if (value.decimalPlaces() > QUANTITY_DECIMALS) {
    return { ok: false, error: uz.pos.tooManyDecimals };
  }
  if (DISCRETE_UNITS.has(unit) && !value.isInteger()) {
    return { ok: false, error: uz.pos.wholeNumberOnly };
  }
  return { ok: true, value };
}

/** Qator summasi = narx × miqdor, so'mgacha yaxlitlanadi (0.5 yuqoriga). */
export function lineTotal(price: number, quantity: Decimal): number {
  return quantity.mul(price).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export type Totals = { subtotal: number; discount: number; total: number };

export function calcTotals(lineTotals: number[], discount: number): Totals {
  const subtotal = lineTotals.reduce((sum, t) => sum + t, 0);
  return { subtotal, discount, total: subtotal - discount };
}

/** Chegirma tekshiruvi: butun, manfiy emas va jami summadan oshmaydi. */
export function discountError(discount: number, subtotal: number): string | null {
  if (!Number.isInteger(discount) || discount < 0) return uz.validation.invalidPrice;
  if (discount > subtotal) return uz.pos.discountTooLarge;
  return null;
}

/** `debt` — nasiyaga qoladigan qism, `points` — bonus ballari bilan (ixtiyoriy). */
export type PaymentInput = {
  cash: number;
  card: number;
  transfer: number;
  debt?: number;
  points?: number;
};

export type Settlement =
  | {
      ok: true;
      /** Kassaga tushadigan summalar (naqd — qaytimsiz) va nasiya. Yig'indisi = total. */
      payments: { method: "CASH" | "CARD" | "TRANSFER" | "DEBT" | "POINTS"; amount: number }[];
      cashReceived: number;
      change: number;
    }
  | { ok: false; error: string };

/**
 * To'lovni tekshiradi va qaytimni hisoblaydi.
 * Qaytim faqat naqddan beriladi: karta + o'tkazma + nasiya + ball jami summadan oshmasligi kerak.
 */
export function settlePayments(total: number, input: PaymentInput): Settlement {
  const { cash, card, transfer, debt = 0, points = 0 } = input;
  if ([cash, card, transfer, debt, points].some((v) => !Number.isInteger(v) || v < 0)) {
    return { ok: false, error: uz.validation.invalidPrice };
  }
  if (card + transfer + debt + points > total) return { ok: false, error: uz.pos.nonCashOverpaid };
  const paid = cash + card + transfer + debt + points;
  if (paid < total) return { ok: false, error: uz.pos.notEnoughPaid };

  const change = paid - total;
  const payments = (
    [
      { method: "CASH", amount: cash - change },
      { method: "CARD", amount: card },
      { method: "TRANSFER", amount: transfer },
      { method: "DEBT", amount: debt },
      { method: "POINTS", amount: points },
    ] as const
  ).filter((p) => p.amount > 0);

  return { ok: true, payments: [...payments], cashReceived: cash, change };
}

/**
 * Qaytarilayotgan qator summasi: qator summasining qaytarilgan ulushi, sotuv chegirmasiga
 * mutanosib kamaytiriladi (chegirma bilan sotilgan tovar chegirmali narxda qaytadi).
 * = qator summasi × (qaytarilgan miqdor / sotilgan miqdor) × (sotuv jami / chegirmasiz jami)
 */
export function returnLineAmount(
  line: { total: number; quantity: Decimal | string },
  returned: Decimal | string,
  sale: { subtotal: number; total: number },
): number {
  const sold = new Decimal(line.quantity);
  if (sold.isZero() || sale.subtotal === 0) return 0;
  return new Decimal(line.total)
    .mul(returned)
    .div(sold)
    .mul(sale.total)
    .div(sale.subtotal)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** Foiz bo'yicha summa (chegirma, keshbek): so'mgacha pastga yaxlitlanadi (mijoz foydasiga emas). */
export function percentOf(amount: number, percent: string | number | Decimal | null | undefined) {
  if (!percent || amount <= 0) return 0;
  return new Decimal(amount)
    .mul(percent)
    .div(100)
    .toDecimalPlaces(0, Decimal.ROUND_DOWN)
    .toNumber();
}

/** Aksiya narxi: narx × (100 − foiz)%, so'mgacha yaxlitlanadi (0.5 yuqoriga). */
export function promoPrice(price: number, percent: string | number | Decimal) {
  return new Decimal(price)
    .mul(new Decimal(100).minus(percent))
    .div(100)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** Qaytarishda usta bonusidan qaytariladigan qism: bonus × qaytarish / sotuv jami. */
export function bonusReturnAmount(bonus: number, returned: number, saleTotal: number): number {
  if (bonus <= 0 || saleTotal <= 0) return 0;
  return new Decimal(bonus)
    .mul(returned)
    .div(saleTotal)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** Smena oxirida kassada bo'lishi kerak bo'lgan naqd pul. */
export function expectedShiftCash(parts: {
  openingCash: number;
  cashSales: number;
  debtPayments: number;
  bonusPayouts: number;
  cashRefunds: number;
}): number {
  return (
    parts.openingCash +
    parts.cashSales +
    parts.debtPayments -
    parts.bonusPayouts -
    parts.cashRefunds
  );
}

/** Usta bonusi = sotuv jami summasi × foiz / 100, so'mgacha yaxlitlanadi. */
export function masterBonus(total: number, percent: string | number | Decimal): number {
  return new Decimal(total)
    .mul(percent)
    .div(100)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}
