/**
 * Lietuviška skaičiaus galūnė: 1, 21, 31 (bet ne 11) → one; 2–9, 22–29 → few; 0, 10–19, 20, 30 → many.
 * Pvz. ltPlural(n, "diena", "dienos", "dienų"): 1 diena, 2 dienos, 10 dienų, 21 diena.
 */
export function ltPlural(n: number, one: string, few: string, many: string): string {
  const i = Math.abs(Math.trunc(n));
  const m10 = i % 10;
  const m100 = i % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 === 0 || (m100 >= 11 && m100 <= 19)) return many;
  return few;
}
