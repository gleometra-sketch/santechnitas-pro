export const TZ = "Europe/Vilnius";

export const MONTHS = ["Sausis","Vasaris","Kovas","Balandis","Gegužė","Birželis","Liepa","Rugpjūtis","Rugsėjis","Spalis","Lapkritis","Gruodis"];
const MONTHS_GEN = ["sausio","vasario","kovo","balandžio","gegužės","birželio","liepos","rugpjūčio","rugsėjo","spalio","lapkričio","gruodžio"];
export const WEEKDAYS_SHORT = ["Pr","An","Tr","Kt","Pn","Št","Sk"];
const WEEKDAYS = ["Pirmadienis","Antradienis","Trečiadienis","Ketvirtadienis","Penktadienis","Šeštadienis","Sekmadienis"];

export const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const parseKey = (k: string) => k.split("-").map(Number) as [number, number, number];

/** Šiandienos data pagal Lietuvos laiką (YYYY-MM-DD). */
export function todayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(k: string, n: number): string {
  const [y, m, d] = parseKey(k);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dayKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** 0 = pirmadienis ... 6 = sekmadienis */
export function weekdayIndex(k: string): number {
  const [y, m, d] = parseKey(k);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function weekStart(k: string): string {
  return addDays(k, -weekdayIndex(k));
}

/** 6 savaičių (42 dienų) tinklelis, prasidedantis pirmadieniu. */
export function monthGrid(year: number, month: number): string[] {
  const first = dayKey(year, month, 1);
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function longDayLabel(k: string): string {
  const [, m, d] = parseKey(k);
  return `${WEEKDAYS[weekdayIndex(k)]}, ${MONTHS_GEN[m - 1]} ${d} d.`;
}

export function shortDayLabel(k: string): string {
  const [, m, d] = parseKey(k);
  return `${MONTHS_GEN[m - 1]} ${d} d., ${WEEKDAYS[weekdayIndex(k)].toLowerCase()}`;
}

export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes - h * 60);
  return `${h} val. ${m} min.`;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" }).format(n);
}

/** Laikas HH:MM pagal Lietuvos laiko juostą. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("lt-LT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export const isValidDayKey = (v: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = parseKey(v);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** "2026-11" -> pirma ir paskutinė mėnesio diena. */
export function monthRange(ym: string): { from: string; to: string; year: number; month: number } {
  const [year, month] = ym.split("-").map(Number);
  const from = dayKey(year, month, 1);
  const nextFirst = month === 12 ? dayKey(year + 1, 1, 1) : dayKey(year, month + 1, 1);
  return { from, to: addDays(nextFirst, -1), year, month };
}

export const monthKey = (k: string) => k.slice(0, 7);

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export const monthTitle = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export function shortDay(k: string): string {
  const [, m, d] = parseKey(k);
  return `${WEEKDAYS[weekdayIndex(k)].slice(0, 3)}, ${pad(m)}-${pad(d)}`;
}

/** Lietuvos dienos pradžios momentas (UTC ISO), pvz. 2026-11-08 -> 2026-11-07T22:00:00.000Z. */
export function dayStartIso(k: string): string {
  const [y, m, d] = parseKey(k);
  for (const off of [3, 2]) {
    const t = Date.UTC(y, m - 1, d) - off * 3_600_000;
    if (todayKey(new Date(t)) === k && todayKey(new Date(t - 1)) !== k) return new Date(t).toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d) - 2 * 3_600_000).toISOString();
}

/** ISO momentas -> "YYYY-MM-DDTHH:mm" pagal Lietuvos laiką (datetime-local laukui). */
export function toLocalInput(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(iso))
    .replace(" ", "T");
}

/** "YYYY-MM-DDTHH:mm" (Lietuvos laikas) -> ISO momentas arba null, jei formatas neteisingas. */
export function fromLocalInput(v: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m || !isValidDayKey(m[1])) return null;
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (h > 23 || min > 59) return null;
  const [y, mo, d] = parseKey(m[1]);
  const asUtc = Date.UTC(y, mo - 1, d, h, min);
  // Lietuvos laikas yra UTC+3 (vasara) arba UTC+2 (žiema): imame tą poslinkį, kuris grąžina tą patį vietinį laiką.
  // Dvigubą valandą (laikrodžių atsukimas) renkamės ankstesnę, neegzistuojančią (laikrodžių pasukimas pirmyn) – žiemos laiku.
  for (const off of [3, 2]) {
    const t = asUtc - off * 3_600_000;
    if (toLocalInput(new Date(t).toISOString()) === v) return new Date(t).toISOString();
  }
  return new Date(asUtc - 2 * 3_600_000).toISOString();
}
