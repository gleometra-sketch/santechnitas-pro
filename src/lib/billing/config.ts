import { PLAN_ORDER, type PlanId } from "@/lib/plans";

export type Interval = "month" | "year";
export const MAX_SEATS = 500;

/** Aplinkos kintamojo pavadinimas Paddle kainos ID: PADDLE_PRICE_<PLANAS>_<MONTHLY|YEARLY>, pvz. PADDLE_PRICE_PRO_MONTHLY. */
export const priceEnvName = (plan: PlanId, interval: Interval) => `PADDLE_PRICE_${plan.toUpperCase()}_${interval === "month" ? "MONTHLY" : "YEARLY"}`;

export const priceIdFor = (plan: PlanId, interval: Interval): string | null => process.env[priceEnvName(plan, interval)] || null;

/** Paddle kainos ID → planas ir laikotarpis (webhook'ui). Nežinomas ID = null. */
export function planFromPriceId(priceId: string | null | undefined, env: Record<string, string | undefined> = process.env): { plan: PlanId; interval: Interval } | null {
  if (!priceId) return null;
  for (const plan of PLAN_ORDER) {
    for (const interval of ["month", "year"] as const) {
      if (env[priceEnvName(plan, interval)] === priceId) return { plan, interval };
    }
  }
  return null;
}
