/**
 * Planai, kainos ir limitai. Limitus ir planų nustatymo taisykles DUOMENŲ BAZĖJE vykdo supabase/migrations/0022_plans.sql
 * (lentelė plan_limits, funkcija _company_plan). Čia esančios reikšmės turi sutapti, tai tikrina tests/unit/plans.test.ts.
 * Kainos eurais BE PVM, už vieną darbuotoją; PVM prideda Paddle pagal pirkėjo šalį. Tikrosios kainos gyvena Paddle
 * (PADDLE_PRICE_* kintamieji), todėl pakeitę kainą pakeiskite ir čia.
 */
export type PlanId = "bazinis" | "pro" | "verslui";
export const PLAN_ORDER: readonly PlanId[] = ["bazinis", "pro", "verslui"];

export type Feature = "materials" | "cars" | "telegram";
export type LimitKey = "documents" | "telegram" | "cars";
export type Limit = { value: number; hard: boolean };

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonth: number; // € / darbuotojui per mėnesį
  priceYear: number; // € / darbuotojui per metus
  limits: Record<LimitKey, Limit>;
  features: Feature[];
  /** Pardavimo puslapio sąrašas. */
  bullets: string[];
  highlight?: boolean;
};

/** Mažiausias apmokamų darbuotojų skaičius (Paddle kainos kiekio minimumas). */
export const MIN_SEATS = 3;
/** Vietų skaičius nemokamo bandymo metu ir nemokamos prieigos (complimentary) atveju. Turi sutapti su 0023_seats.sql. */
export const TRIAL_SEATS = 10;
export const COMPLIMENTARY_SEATS = 1000;

const CORE = [
  "Objektai, darbai ir kalendorius",
  "Darbo laiko apskaita telefone",
  "Darbuotojų kvietimas, įkainiai ir valandų patvirtinimas",
  "Pastabos biurui ir pranešimai programoje",
];

export const PLANS: Plan[] = [
  {
    id: "bazinis",
    name: "Bazinis",
    tagline: "Darbo laikas, darbai ir kalendorius",
    priceMonth: 3,
    priceYear: 30,
    limits: { documents: { value: 10, hard: true }, telegram: { value: 0, hard: true }, cars: { value: 0, hard: true } },
    features: [],
    bullets: [...CORE, "Iki 10 naujų sąmatų ir sutarčių per mėnesį"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Kai reikia medžiagų, Telegram ir daugiau dokumentų",
    priceMonth: 5,
    priceYear: 50,
    limits: { documents: { value: 40, hard: true }, telegram: { value: 300, hard: true }, cars: { value: 2, hard: true } },
    features: ["materials", "cars", "telegram"],
    bullets: ["Viskas, kas Bazinis", "Medžiagų užsakymai ir pirkimų sąrašas", "Iki 2 automobilių su terminų priminimais", "Telegram pranešimai (300 per mėnesį)", "Iki 40 naujų sąmatų ir sutarčių per mėnesį"],
    highlight: true,
  },
  {
    id: "verslui",
    name: "Verslui",
    tagline: "Didesnėms komandoms be rūpesčių dėl limitų",
    priceMonth: 8,
    priceYear: 80,
    limits: { documents: { value: 300, hard: false }, telegram: { value: 5000, hard: false }, cars: { value: 10, hard: true } },
    features: ["materials", "cars", "telegram"],
    bullets: ["Viskas, kas Pro", "Iki 10 automobilių", "Visi Telegram pranešimai, įskaitant darbo pradžią ir pabaigą", "Sąmatos ir sutartys be griežto limito (sąžiningo naudojimo riba 300 per mėnesį)"],
  },
];

export const planById = (id: string | null | undefined): Plan | null => PLANS.find((p) => p.id === id) ?? null;
export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && PLAN_ORDER.includes(v as PlanId);

export const canUse = (plan: PlanId | null, feature: Feature): boolean => !!plan && !!planById(plan)?.features.includes(feature);
export const limitOf = (plan: PlanId | null, key: LimitKey): Limit | null => (plan ? planById(plan)?.limits[key] ?? null : null);

/** Mažiausias planas, turintis funkciją (įspėjimams „prieinama Pro ir Verslui“). */
export const minPlanFor = (feature: Feature): Plan => PLANS.find((p) => p.features.includes(feature)) ?? PLANS[PLANS.length - 1];

/**
 * Tos pačios taisyklės kaip SQL funkcijoje _company_plan: nemokama prieiga = Verslui; aktyvi / bandomoji / vėluojanti
 * prenumerata = jos planas (be plan_id = Bazinis); galiojantis nemokamas bandymas = Pro; kitaip plano nėra.
 */
export function planOf(input: {
  complimentary: boolean;
  trialEndsAt: string | Date;
  subscription: { status: string; planId: string | null } | null;
  now?: Date;
}): PlanId | null {
  if (input.complimentary) return "verslui";
  const st = input.subscription?.status;
  if (st === "trialing" || st === "active" || st === "past_due") return isPlanId(input.subscription!.planId) ? (input.subscription!.planId as PlanId) : "bazinis";
  if (new Date(input.trialEndsAt).getTime() > (input.now ?? new Date()).getTime()) return "pro";
  return null;
}

/** Naudojimo juostos būsena: ok < 80 % ≤ warn < 100 % ≤ full. */
export function usageLevel(used: number, limit: number): "ok" | "warn" | "full" {
  if (limit <= 0) return "full";
  if (used >= limit) return "full";
  return used >= Math.ceil(limit * 0.8) ? "warn" : "ok";
}

export const priceLabel = (p: Plan, interval: "month" | "year") => `${interval === "month" ? p.priceMonth : p.priceYear} €`;

/**
 * Vietų limitas (tos pačios taisyklės kaip SQL funkcijoje _company_seat_limit, 0023_seats.sql):
 * nemokama prieiga = 1000; aktyvi / vėluojanti / bandomoji prenumerata = apmokėtos vietos; galiojantis bandymas = 10; kitaip 0.
 * Vieta = aktyvus narys arba laukiantis pakvietimas (įskaitant administratorius).
 */
export function seatLimit(input: {
  complimentary: boolean;
  trialEndsAt: string | Date;
  subscription: { status: string; seats: number } | null;
  now?: Date;
}): number {
  if (input.complimentary) return COMPLIMENTARY_SEATS;
  const st = input.subscription?.status;
  if (st === "trialing" || st === "active" || st === "past_due") return Math.max(1, input.subscription!.seats || 1);
  return new Date(input.trialEndsAt).getTime() > (input.now ?? new Date()).getTime() ? TRIAL_SEATS : 0;
}
