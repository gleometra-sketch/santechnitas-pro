import { test } from "node:test";
import assert from "node:assert/strict";
import { hmacHex, paymentFromEvent, subscriptionFromEvent, verifyPaddleSignature } from "../../src/lib/billing/paddle";

const SECRET = "pdl_ntfset_test_secret";
const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", occurred_at: "2026-11-18T10:00:00Z", data: {} });
const NOW = 1_800_000_000;

async function header(ts: number, raw = body, secret = SECRET) {
  return `ts=${ts};h1=${await hmacHex(secret, `${ts}:${raw}`)}`;
}

test("verifyPaddleSignature: tinkamas parašas", async () => {
  assert.equal(await verifyPaddleSignature(body, await header(NOW), SECRET, NOW), true);
});

test("verifyPaddleSignature: pakeistas kūnas, blogas raktas, nėra antraštės", async () => {
  assert.equal(await verifyPaddleSignature(body + " ", await header(NOW), SECRET, NOW), false);
  assert.equal(await verifyPaddleSignature(body, await header(NOW, body, "kitas"), SECRET, NOW), false);
  assert.equal(await verifyPaddleSignature(body, null, SECRET, NOW), false);
  assert.equal(await verifyPaddleSignature(body, "ts=abc;h1=00", SECRET, NOW), false);
});

test("verifyPaddleSignature: per sena žymė atmetama", async () => {
  assert.equal(await verifyPaddleSignature(body, await header(NOW - 600), SECRET, NOW), false);
  assert.equal(await verifyPaddleSignature(body, await header(NOW - 100), SECRET, NOW), true);
});

test("verifyPaddleSignature: keli h1 (rakto keitimas)", async () => {
  const good = await hmacHex(SECRET, `${NOW}:${body}`);
  assert.equal(await verifyPaddleSignature(body, `ts=${NOW};h1=deadbeef;h1=${good}`, SECRET, NOW), true);
});

const COMPANY = "0b6c2f0e-5d9a-4c0e-9a55-1f2b3c4d5e6f";
const sub = {
  id: "sub_01",
  customer_id: "ctm_01",
  status: "active",
  items: [{ quantity: 7, price: { id: "pri_month" } }],
  billing_cycle: { interval: "month", frequency: 1 },
  current_billing_period: { ends_at: "2026-12-18T10:00:00Z" },
  scheduled_change: null,
  custom_data: { company_id: COMPANY },
};

test("subscriptionFromEvent: aktyvi mėnesinė prenumerata", () => {
  const r = subscriptionFromEvent(sub)!;
  assert.equal(r.companyId, COMPANY);
  assert.deepEqual(r.record, {
    provider_customer_id: "ctm_01",
    provider_subscription_id: "sub_01",
    status: "active",
    plan_interval: "month",
    seats: 7,
    price_id: "pri_month",
    current_period_end: "2026-12-18T10:00:00Z",
    cancel_at_period_end: false,
  });
});

test("subscriptionFromEvent: suplanuotas atšaukimas ir netinkama įmonė", () => {
  const r = subscriptionFromEvent({ ...sub, scheduled_change: { action: "cancel", effective_at: "2026-12-18T10:00:00Z" }, custom_data: { company_id: "ne-uuid" } })!;
  assert.equal(r.record.cancel_at_period_end, true);
  assert.equal(r.companyId, null);
});

test("subscriptionFromEvent: nežinoma būsena arba trūkstami laukai", () => {
  assert.equal(subscriptionFromEvent({ ...sub, status: "weird" }), null);
  assert.equal(subscriptionFromEvent({ status: "active" }), null);
  assert.equal(subscriptionFromEvent(null), null);
});

test("paymentFromEvent: apmokėta ir nepavyko", () => {
  const txn = { id: "txn_01", subscription_id: "sub_01", currency_code: "EUR", billed_at: "2026-11-18T10:01:00Z", details: { totals: { grand_total: "2100" } }, custom_data: { company_id: COMPANY } };
  assert.deepEqual(paymentFromEvent("transaction.completed", txn, "2026-11-18T10:02:00Z"), {
    companyId: COMPANY,
    subscriptionId: "sub_01",
    provider_transaction_id: "txn_01",
    amount_cents: 2100,
    currency: "eur",
    status: "paid",
    paid_at: "2026-11-18T10:01:00Z",
  });
  const failed = paymentFromEvent("transaction.payment_failed", txn, "2026-11-18T10:02:00Z")!;
  assert.equal(failed.status, "failed");
  assert.equal(failed.paid_at, null);
  assert.equal(paymentFromEvent("transaction.created", txn, "x"), null);
});
