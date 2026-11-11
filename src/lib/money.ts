const eur = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" });

/** Centai -> „12,50 €“. */
export const formatMoney = (cents: number) => eur.format(cents / 100);

/** Įvesties tekstas (pvz. „12,5“) -> centai arba null, jei neteisingas ar per didelis (iki 1000 €/val.). */
export function parseEuroToCents(input: string): number | null {
  const v = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(v)) return null;
  const cents = Math.round(Number(v) * 100);
  return cents >= 0 && cents <= 100000 ? cents : null;
}
