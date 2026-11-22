import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import { isPlanId, type PlanId } from "@/lib/plans";

export type BillingView = {
  subscription: { status: string; plan: PlanId | null; interval: "month" | "year" | null; seats: number; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  payments: { id: string; amountCents: number; currency: string; status: string; paidAt: string | null; createdAt: string }[];
  activeMembers: number;
};

export async function getBilling(ctx: SessionContext): Promise<BillingView> {
  const supabase = await createClient();
  const cid = ctx.company!.id;
  const [sub, pay, members] = await Promise.all([
    supabase.from("subscriptions").select("status, plan_id, plan_interval, seats, current_period_end, cancel_at_period_end").eq("company_id", cid).maybeSingle(),
    supabase.from("payments").select("id, amount_cents, currency, status, paid_at, created_at").eq("company_id", cid).order("created_at", { ascending: false }).limit(12),
    supabase.from("company_members").select("user_id", { count: "exact", head: true }).eq("company_id", cid).eq("status", "active"),
  ]);
  const s = sub.data;
  return {
    subscription: s
      ? {
          status: s.status as string,
          plan: isPlanId(s.plan_id) ? s.plan_id : null,
          interval: (s.plan_interval as "month" | "year" | null) ?? null,
          seats: s.seats as number,
          currentPeriodEnd: (s.current_period_end as string | null) ?? null,
          cancelAtPeriodEnd: s.cancel_at_period_end === true,
        }
      : null,
    payments: ((pay.data ?? []) as { id: string; amount_cents: number; currency: string; status: string; paid_at: string | null; created_at: string }[]).map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      paidAt: p.paid_at,
      createdAt: p.created_at,
    })),
    activeMembers: Math.max(1, members.count ?? 1),
  };
}
