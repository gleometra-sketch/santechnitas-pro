/**
 * Sąmatos skaičiavimai. Visi pinigai – sveiki centai, kiekiai – tūkstantosios (3 skaitmenys po kablelio),
 * procentai – šimtosios (21,5 % = 2150), todėl nėra slankiojo kablelio paklaidų.
 * Ta pati logika yra duomenų bazėje (view estimate_subtotals, migracija 0016): suma = round(kiekis × kaina).
 */
import { formatMoney } from "@/lib/money";

export type LineKind = "material" | "work" | "other";
export const LINE_KINDS: LineKind[] = ["material", "work", "other"];
export const KIND_LABEL: Record<LineKind, string> = { material: "Medžiagos", work: "Darbai", other: "Kita" };
export const KIND_ADD_LABEL: Record<LineKind, string> = {
  material: "Pridėti medžiagą",
  work: "Pridėti darbą",
  other: "Pridėti kitą eilutę",
};
export const DEFAULT_UNIT: Record<LineKind, string> = { material: "vnt.", work: "val.", other: "vnt." };
export const UNITS = ["vnt.", "m", "m²", "m³", "kg", "l", "kompl.", "pak.", "rul.", "por.", "val.", "d.", "paslauga"];

export const MAX_LINES = 300;
export const MAX_QTY_MILLI = 100_000_000; // 100 000
export const MAX_PRICE_CENTS = 100_000_000; // 1 000 000 €

const clean = (s: string) => s.trim().replace(/\s/g, "").replace(",", ".");

/** „12,5“ -> 12500. Neteisinga (arba tuščia) reikšmė -> null. Iki 3 skaitmenų po kablelio. */
export function parseQuantity(input: string): number | null {
  const m = /^(\d{1,6})(?:\.(\d{1,3}))?$/.exec(clean(input));
  if (!m) return null;
  const milli = Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0"));
  return milli <= MAX_QTY_MILLI ? milli : null;
}

/** „12,5“ -> 1250 (centai). Iki 2 skaitmenų po kablelio, ne daugiau 1 000 000 €. */
export function parsePriceCents(input: string): number | null {
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(clean(input));
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return cents <= MAX_PRICE_CENTS ? cents : null;
}

/** „21,5“ -> 2150 (šimtosios procento dalys). 0–100 %. */
export function parsePercentHundredths(input: string): number | null {
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(clean(input));
  if (!m) return null;
  const h = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return h <= 10_000 ? h : null;
}

/** 12500 -> „12,5“, 3000 -> „3“. */
export function formatQty(milli: number): string {
  const whole = Math.trunc(milli / 1000);
  const frac = milli % 1000;
  return frac === 0 ? String(whole) : `${whole},${String(frac).padStart(3, "0").replace(/0+$/, "")}`;
}

/** 1250 -> „12,50“ (laukelio reikšmė). */
export const formatInputCents = (cents: number) => `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, "0")}`;

/** 2150 -> „21,5“, 2100 -> „21“. */
export function formatInputPercent(h: number): string {
  const frac = h % 100;
  return frac === 0 ? String(Math.trunc(h / 100)) : `${Math.trunc(h / 100)},${String(frac).padStart(2, "0").replace(/0+$/, "")}`;
}

export const formatEuro = formatMoney;

/** Eilutės suma centais: kiekis × kaina, apvalinama iki cento (pusė – į viršų). */
export function lineTotalCents(qtyMilli: number, priceCents: number): number {
  return Number((BigInt(qtyMilli) * BigInt(priceCents) + 500n) / 1000n);
}

/** Procentas nuo sumos centais (procentas šimtosiomis), apvalinama iki cento. */
export function percentOfCents(cents: number, hundredths: number): number {
  return Number((BigInt(cents) * BigInt(hundredths) + 5000n) / 10000n);
}

export type CalcLine = { kind: LineKind; qtyMilli: number; priceCents: number };

export type Totals = {
  materials: number;
  works: number;
  other: number;
  subtotal: number;
  discount: number;
  /** Suma po nuolaidos, be PVM. */
  net: number;
  vat: number;
  total: number;
};

/** Iš tarpinės sumos (be nuolaidos) apskaičiuoja nuolaidą, PVM ir galutinę sumą. */
export function totalsFromSubtotal(subtotal: number, discountHundredths: number, vatHundredths: number) {
  const discount = percentOfCents(subtotal, discountHundredths);
  const net = subtotal - discount;
  const vat = percentOfCents(net, vatHundredths);
  return { subtotal, discount, net, vat, total: net + vat };
}

export function calcTotals(lines: CalcLine[], discountHundredths: number, vatHundredths: number): Totals {
  const by: Record<LineKind, number> = { material: 0, work: 0, other: 0 };
  for (const l of lines) by[l.kind] += lineTotalCents(l.qtyMilli, l.priceCents);
  const subtotal = by.material + by.work + by.other;
  return { materials: by.material, works: by.work, other: by.other, ...totalsFromSubtotal(subtotal, discountHundredths, vatHundredths) };
}
