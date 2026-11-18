import { DEFAULT_UNIT, MAX_PRICE_CENTS, type LineKind } from "./calc";

export type LearnInput = { kind?: LineKind; description: string; unit?: string | null; unit_price: number | string };
export type Learned = { kind: LineKind; name: string; unit: string; priceCents: number };

const toNumber = (v: number | string) => (typeof v === "number" ? v : Number(v.replace(/\s/g, "").replace(",", ".")));

/**
 * Kurios sąmatos eilutės įsimenamos kataloge: su pavadinimu (iki 200 simbolių) ir kaina didesne už 0.
 * Pavadinimas laikomas ta pačia pozicija nepriklausomai nuo didžiųjų raidžių ir tarpų, laimi paskutinė eilutė.
 */
export function learnFromItems(items: LearnInput[]): Learned[] {
  const byKey = new Map<string, Learned>();
  for (const it of items) {
    const name = it.description.trim();
    const n = toNumber(it.unit_price);
    const priceCents = Math.round(n * 100);
    if (!name || name.length > 200 || !Number.isFinite(n) || priceCents <= 0 || priceCents > MAX_PRICE_CENTS) continue;
    const kind: LineKind = it.kind ?? "material";
    const unit = (it.unit ?? "").trim();
    byKey.set(name.toLowerCase(), { kind, name, unit: unit && unit.length <= 20 ? unit : DEFAULT_UNIT[kind], priceCents });
  }
  return [...byKey.values()];
}
