import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import type { PlanId } from "@/lib/plans";
import { isPlanId } from "@/lib/plans";

export type UsageLine = { used: number; limit: number; hard: boolean };
export type PlanUsage = { plan: PlanId | null; documents: UsageLine; telegram: UsageLine; cars: UsageLine; seats: UsageLine };

const line = (v: unknown): UsageLine => {
  const o = (v ?? {}) as { used?: unknown; limit?: unknown; hard?: unknown };
  return { used: Number(o.used ?? 0), limit: Number(o.limit ?? 0), hard: o.hard !== false };
};

/** Šio mėnesio naudojimas (dokumentai, Telegram, automobiliai). Tik administratoriui; nesėkmės atveju null. */
export async function getPlanUsage(ctx: SessionContext): Promise<PlanUsage | null> {
  if (!ctx.company) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("plan_usage", { cid: ctx.company.id });
  if (error || !data) {
    if (error) console.error("plan_usage:", error.message);
    return null;
  }
  const d = data as { plan?: unknown; documents?: unknown; telegram?: unknown; cars?: unknown; seats?: unknown };
  return { plan: isPlanId(d.plan) ? d.plan : null, documents: line(d.documents), telegram: line(d.telegram), cars: line(d.cars), seats: line(d.seats) };
}
