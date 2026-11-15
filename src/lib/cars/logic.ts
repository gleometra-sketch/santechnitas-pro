// Automobilių logika be Supabase. Visos datos – YYYY-MM-DD (kaip todayKey() iš "@/lib/dates").

export type Level = "ok" | "warn" | "expired";

export type CarRow = {
  id: string;
  name: string;
  plate: string;
  vin: string | null;
  driver_id: string | null;
  active: boolean;
  needs_km: boolean;
  km: number;
  km_date: string | null;
  oil_last_km: number;
  oil_interval_km: number;
  oil_warn_km: number;
  reminder_days: number; // 7 | 14 | 21
  inspection_until: string | null;
  road_tax_until: string | null;
  insurance_until: string | null;
};

export type CarAlert = { kind: "inspection" | "road_tax" | "insurance" | "oil" | "km"; level: Level; text: string };

export const REMINDER_CHOICES = [7, 14, 21] as const;

const DAY_MS = 86_400_000;
const utc = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const daysBetween = (fromKey: string, toKey: string) => Math.round((utc(toKey) - utc(fromKey)) / DAY_MS);
const fmtKm = (n: number) => n.toLocaleString("lt-LT");

export function validateKm(newKm: number, currentKm: number): string | null {
  if (!Number.isFinite(newKm) || newKm <= 0) return "Įveskite kilometražą.";
  if (newKm < currentKm) return `Rodmuo negali būti mažesnis nei ${fmtKm(currentKm)} km.`;
  return null;
}

export const oilLeftKm = (c: CarRow) => c.oil_last_km + c.oil_interval_km - c.km;

function deadlineAlert(kind: CarAlert["kind"], label: string, until: string | null, today: string): CarAlert | null {
  if (!until) return null;
  const left = daysBetween(today, until);
  if (left < 0) return { kind, level: "expired", text: `${label}: pasibaigė prieš ${-left} d.` };
  if (left <= 30) return { kind, level: "warn", text: `${label}: liko ${left} d.` };
  return null;
}

/** Dienų iki kito kilometražo priminimo (≤ 0 – jau laikas); null, kai priminimai sustabdyti. */
export function daysToKmReminder(c: CarRow, today: string): number | null {
  if (!c.active) return null;
  if (c.needs_km || !c.km_date) return 0;
  return c.reminder_days - daysBetween(c.km_date, today);
}

/**
 * Terminų (TA, kelių mokestis, draudimas) priminimai lieka ir neaktyviam automobiliui;
 * kilometražo ir tepalų priminimai neaktyviam sustabdomi.
 */
export function carAlerts(c: CarRow, today: string): CarAlert[] {
  const list: (CarAlert | null)[] = [
    deadlineAlert("inspection", "Techninė apžiūra", c.inspection_until, today),
    deadlineAlert("road_tax", "Kelių mokestis", c.road_tax_until, today),
    deadlineAlert("insurance", "Draudimas", c.insurance_until, today),
  ];
  if (c.active) {
    const left = oilLeftKm(c);
    if (left < 0) list.push({ kind: "oil", level: "expired", text: `Tepalų keitimas pavėluotas ${fmtKm(-left)} km` });
    else if (left <= c.oil_warn_km) list.push({ kind: "oil", level: "warn", text: `Iki tepalų keitimo liko ${fmtKm(left)} km` });
    const d = daysToKmReminder(c, today);
    if (d !== null && d <= 0)
      list.push({ kind: "km", level: "warn", text: c.needs_km ? "Įveskite pirmą kilometražo rodmenį" : "Laikas įvesti kilometražą" });
  }
  const order: Record<Level, number> = { expired: 0, warn: 1, ok: 2 };
  return list.filter((a): a is CarAlert => a !== null).sort((a, b) => order[a.level] - order[b.level]);
}


export type CalendarCarItem = { car: CarRow; alerts: CarAlert[]; showKmForm: boolean };

/**
 * Ką rodyti kalendoriaus viršuje. Automobilis rodomas tik kai yra ką priminti (terminai, tepalai, kilometražas).
 * Kilometražo forma – tik vairuotojui, kai atėjo laikas įvesti rodmenį; kol jis įvestas ir kitas priminimas
 * dar neatėjo, kilometražo kalendoriuje nėra visai (jį visada galima įvesti skiltyje „Automobiliai“).
 */
export function calendarCarItems(cars: CarRow[], today: string, userId: string): CalendarCarItem[] {
  const items: CalendarCarItem[] = [];
  for (const car of cars) {
    const alerts = carAlerts(car, today);
    if (alerts.length === 0) continue;
    const d = daysToKmReminder(car, today);
    items.push({ car, alerts, showKmForm: car.driver_id === userId && car.active && d !== null && d <= 0 });
  }
  return items;
}


// ---------------------------------------------------------------- aiškūs būsenų blokai (rodomi ekrane)

export type StatusLevel = Level | "none";
export type CarStatus = {
  kind: CarAlert["kind"];
  label: string;
  /** Pagrindinė reikšmė: data arba kilometrai (rodoma stambiai). */
  value: string;
  /** Aiškus sakinys, kas vyksta (rodomas paryškintai, spalvotai). */
  detail: string;
  /** Papildoma smulkesnė eilutė (pvz. kada atnaujintas kilometražas). */
  meta?: string;
  level: StatusLevel;
};

function deadlineStatus(kind: CarStatus["kind"], label: string, until: string | null, today: string): CarStatus {
  if (!until) return { kind, label, value: "Nenurodyta", detail: "Data neįvesta", level: "none" };
  const left = daysBetween(today, until);
  if (left < 0) return { kind, label, value: until, detail: `Pasibaigė prieš ${-left} d.`, level: "expired" };
  if (left === 0) return { kind, label, value: until, detail: "Baigiasi šiandien", level: "warn" };
  if (left <= 30) return { kind, label, value: until, detail: `Liko ${left} d.`, level: "warn" };
  return { kind, label, value: until, detail: `Liko ${left} d.`, level: "ok" };
}

/** Penki blokai: techninė apžiūra, kelių mokestis, draudimas, tepalai, kilometražas. */
export function carStatuses(c: CarRow, today: string): CarStatus[] {
  const oilNext = c.oil_last_km + c.oil_interval_km;
  const left = oilLeftKm(c);
  const oil: CarStatus = !c.active
    ? { kind: "oil", label: "Tepalai", value: `Keisti ties ${fmtKm(oilNext)} km`, detail: "Priminimai sustabdyti (neaktyvus)", level: "none" }
    : left < 0
      ? { kind: "oil", label: "Tepalai", value: `Keisti buvo ties ${fmtKm(oilNext)} km`, detail: `Pavėluota ${fmtKm(-left)} km`, level: "expired" }
      : { kind: "oil", label: "Tepalai", value: `Liko ${fmtKm(left)} km`, detail: left <= c.oil_warn_km ? `Netrukus keisti, ties ${fmtKm(oilNext)} km` : `Keisti ties ${fmtKm(oilNext)} km`, level: left <= c.oil_warn_km ? "warn" : "ok" };

  const next = daysToKmReminder(c, today);
  const km: CarStatus = {
    kind: "km", label: "Kilometražas", value: `${fmtKm(c.km)} km`,
    detail: next === null ? "Priminimai sustabdyti (neaktyvus)" : c.needs_km ? "Įveskite pirmą rodmenį" : next <= 0 ? "Laikas įvesti kilometražą" : `Kitas priminimas po ${next} d.`,
    meta: c.km_date ? `Paskutinį kartą įvesta ${c.km_date}` : undefined,
    level: next === null ? "none" : next <= 0 ? "warn" : "ok",
  };

  return [
    deadlineStatus("inspection", "Techninė apžiūra iki", c.inspection_until, today),
    deadlineStatus("road_tax", "Kelių mokestis iki", c.road_tax_until, today),
    deadlineStatus("insurance", "Draudimas iki", c.insurance_until, today),
    oil,
    km,
  ];
}
