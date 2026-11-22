import { applyPaddleEvent, type PaddleEvent } from "@/lib/billing/apply";
import { verifyPaddleSignature } from "@/lib/billing/paddle";

export const dynamic = "force-dynamic";

/**
 * Paddle webhook. Be galiojančio Paddle-Signature (HMAC-SHA256, slaptas raktas PADDLE_WEBHOOK_SECRET) užklausa atmetama.
 * Apdorojus grąžiname 200; nepavykus – 500, tada Paddle bando dar kartą (įvykiai idempotentiški).
 */
export async function POST(req: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  const raw = await req.text(); // neliesta užklausos kūno eilutė, parašas skaičiuojamas iš jos
  if (!secret || !(await verifyPaddleSignature(raw, req.headers.get("paddle-signature"), secret))) {
    return new Response("forbidden", { status: 403 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(raw) as PaddleEvent;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (typeof event?.event_id !== "string" || typeof event?.event_type !== "string" || typeof event?.occurred_at !== "string") {
    return new Response("bad request", { status: 400 });
  }

  try {
    const result = await applyPaddleEvent(event);
    return Response.json({ ok: true, result });
  } catch (e) {
    console.error("Paddle webhook klaida:", event.event_type, e);
    return new Response("error", { status: 500 });
  }
}
