import { createAdminClient } from "@/lib/supabase/admin";
import { planFromPriceId } from "./config";
import { paymentFromEvent, subscriptionFromEvent } from "./paddle";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PaddleEvent = { event_id: string; event_type: string; occurred_at: string; data: any };
export type ApplyResult = "processed" | "duplicate" | "ignored";

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.trialing",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
]);
const PAYMENT_EVENTS = new Set(["transaction.completed", "transaction.payment_failed"]);

/**
 * Apdoroja vieną patikrintą Paddle įvykį (service_role). Idempotentiška: tas pats event_id apdorojamas tik kartą.
 * Nepavykus apdoroti, įvykio žyma pašalinama ir metama klaida, kad Paddle bandytų dar kartą.
 */
export async function applyPaddleEvent(event: PaddleEvent): Promise<ApplyResult> {
  const isSub = SUBSCRIPTION_EVENTS.has(event.event_type);
  const isPay = PAYMENT_EVENTS.has(event.event_type);
  if (!isSub && !isPay) return "ignored";

  const db = createAdminClient();
  const { error: dupErr } = await db.from("billing_events").insert({ id: event.event_id, type: event.event_type });
  if (dupErr) {
    if (dupErr.code === "23505") return "duplicate";
    throw dupErr;
  }

  try {
    return isSub ? await applySubscription(db, event) : await applyPayment(db, event);
  } catch (e) {
    await db.from("billing_events").delete().eq("id", event.event_id);
    throw e;
  }
}

type Db = ReturnType<typeof createAdminClient>;

async function applySubscription(db: Db, event: PaddleEvent): Promise<ApplyResult> {
  const parsed = subscriptionFromEvent(event.data);
  if (!parsed) return "ignored";
  let companyId = parsed.companyId;
  if (!companyId) {
    const { data } = await db.from("subscriptions").select("company_id").eq("provider_subscription_id", parsed.record.provider_subscription_id).maybeSingle();
    companyId = (data?.company_id as string | undefined) ?? null;
  }
  if (!companyId) {
    console.warn("Paddle: prenumeratai nerasta įmonė", parsed.record.provider_subscription_id);
    return "ignored";
  }

  // Pavėluotas senesnis įvykis negali perrašyti naujesnės būsenos.
  const { data: existing } = await db.from("subscriptions").select("last_event_at").eq("company_id", companyId).maybeSingle();
  if (existing?.last_event_at && new Date(existing.last_event_at as string).getTime() > new Date(event.occurred_at).getTime()) return "ignored";

  // Planas nustatomas pagal Paddle kainos ID (PADDLE_PRICE_* kintamieji). Nežinomos kainos plano nekeičiame.
  const mapped = planFromPriceId(parsed.record.price_id);
  const { error } = await db
    .from("subscriptions")
    .upsert({ company_id: companyId, provider: "paddle", ...parsed.record, ...(mapped ? { plan_id: mapped.plan } : {}), last_event_at: event.occurred_at }, { onConflict: "company_id" });
  if (!mapped) console.warn("Paddle: nežinomas kainos ID, plano nekeičiame", parsed.record.price_id);
  if (error) {
    if (error.code === "23503") {
      console.warn("Paddle: įmonė neegzistuoja", companyId);
      return "ignored";
    }
    throw error;
  }
  return "processed";
}

async function applyPayment(db: Db, event: PaddleEvent): Promise<ApplyResult> {
  const p = paymentFromEvent(event.event_type, event.data, event.occurred_at);
  if (!p) return "ignored";
  let companyId = p.companyId;
  if (!companyId && p.subscriptionId) {
    const { data } = await db.from("subscriptions").select("company_id").eq("provider_subscription_id", p.subscriptionId).maybeSingle();
    companyId = (data?.company_id as string | undefined) ?? null;
  }
  if (!companyId) return "ignored";
  const { error } = await db.from("payments").upsert(
    { company_id: companyId, provider_transaction_id: p.provider_transaction_id, amount_cents: p.amount_cents, currency: p.currency, status: p.status, paid_at: p.paid_at },
    { onConflict: "provider_transaction_id" },
  );
  if (error) {
    if (error.code === "23503") return "ignored";
    throw error;
  }
  return "processed";
}
