/** Paddle pagalbinės funkcijos be priklausomybių (veikia Cloudflare Workers ir Node). */

export type PaddleEnv = "sandbox" | "production";
export const paddleEnv = (): PaddleEnv => (process.env.PADDLE_ENV === "production" ? "production" : "sandbox");
export const paddleApiBase = (env: PaddleEnv = paddleEnv()) => (env === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com");

/** Viešos Paddle.js nuostatos (kliento raktas nėra paslaptis). Skaitoma vykdymo metu serveryje ir perduodama komponentui. */
export const paddleClientConfig = () => ({ token: process.env.PADDLE_CLIENT_TOKEN ?? "", env: paddleEnv() });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Paddle-Signature: „ts=<unix>;h1=<hex>“ (kelios h1 reikšmės galimos keičiant slaptą raktą).
 * Parašas = HMAC-SHA256(secret, „ts:rawBody“). Būtina naudoti neliestą užklausos tekstą.
 * Per sena žymė (daugiau nei 5 min.) atmetama kaip galimas pakartojimas.
 */
export async function verifyPaddleSignature(rawBody: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(";").map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith("ts="))?.slice(3);
  const sigs = parts.filter((p) => p.startsWith("h1=")).map((p) => p.slice(3));
  if (!ts || !/^\d+$/.test(ts) || sigs.length === 0) return false;
  if (Math.abs(nowSec - Number(ts)) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${ts}:${rawBody}`);
  return sigs.some((s) => safeEqual(s, expected));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUSES = ["trialing", "active", "past_due", "canceled", "paused"] as const;

export type SubscriptionRecord = {
  provider_customer_id: string;
  provider_subscription_id: string;
  status: (typeof STATUSES)[number];
  plan_interval: "month" | "year" | null;
  seats: number;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const companyIdOf = (data: any): string | null => {
  const id = data?.custom_data?.company_id;
  return typeof id === "string" && UUID.test(id) ? id : null;
};

/** Paddle prenumeratos įvykio duomenys → mūsų lentelės eilutė. Netinkami duomenys = null. */
export function subscriptionFromEvent(data: any): { companyId: string | null; record: SubscriptionRecord } | null {
  if (!data || typeof data.id !== "string" || typeof data.customer_id !== "string") return null;
  const status = (STATUSES as readonly string[]).includes(data.status) ? (data.status as SubscriptionRecord["status"]) : null;
  if (!status) return null;
  const item = Array.isArray(data.items) ? data.items[0] : null;
  const qty = Number(item?.quantity);
  const interval = data.billing_cycle?.interval;
  return {
    companyId: companyIdOf(data),
    record: {
      provider_customer_id: data.customer_id,
      provider_subscription_id: data.id,
      status,
      plan_interval: interval === "month" || interval === "year" ? interval : null,
      seats: Number.isInteger(qty) && qty >= 1 ? qty : 1,
      price_id: typeof item?.price?.id === "string" ? item.price.id : null,
      current_period_end: typeof data.current_billing_period?.ends_at === "string" ? data.current_billing_period.ends_at : null,
      cancel_at_period_end: data.scheduled_change?.action === "cancel",
    },
  };
};

export type PaymentRecord = { companyId: string | null; subscriptionId: string | null; provider_transaction_id: string; amount_cents: number; currency: string; status: "paid" | "failed"; paid_at: string | null };

/** transaction.completed / transaction.payment_failed → mokėjimo eilutė. */
export function paymentFromEvent(eventType: string, data: any, occurredAt: string): PaymentRecord | null {
  if (!data || typeof data.id !== "string") return null;
  const paid = eventType === "transaction.completed";
  if (!paid && eventType !== "transaction.payment_failed") return null;
  const total = Number(data.details?.totals?.grand_total ?? data.details?.totals?.total ?? 0);
  return {
    companyId: companyIdOf(data),
    subscriptionId: typeof data.subscription_id === "string" ? data.subscription_id : null,
    provider_transaction_id: data.id,
    amount_cents: Number.isFinite(total) && total >= 0 ? Math.round(total) : 0,
    currency: typeof data.currency_code === "string" ? data.currency_code.toLowerCase() : "eur",
    status: paid ? "paid" : "failed",
    paid_at: paid ? (typeof data.billed_at === "string" ? data.billed_at : occurredAt) : null,
  };
}
