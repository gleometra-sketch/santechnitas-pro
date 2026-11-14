// Kiekio keitimas rodyklėmis (be React, kad būtų galima testuoti).

const MAX_QTY = 100000; // kaip requestSchema serveryje

/** Padidina / sumažina kiekį (tekstą su kableliu ar tašku). Grąžina naują tekstą arba null, jei keisti negalima (kiekis turi būti > 0). */
export function stepQty(current: string, delta: number): string | null {
  const parsed = Number(current.trim().replace(",", "."));
  const base = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const next = Math.round((base + delta) * 100) / 100;
  if (next <= 0 || next > MAX_QTY) return null;
  return String(next).replace(".", ",");
}
