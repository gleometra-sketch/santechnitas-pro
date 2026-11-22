import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLANS, canUse, limitOf, minPlanFor, planOf, usageLevel } from "../../src/lib/plans";
import { planFromPriceId, priceEnvName } from "../../src/lib/billing/config";

const NOW = new Date("2026-11-20T10:00:00Z");
const future = "2026-12-01T00:00:00Z";
const past = "2026-11-01T00:00:00Z";

test("planOf: nemokama prieiga, prenumerata, bandymas, nieko", () => {
  assert.equal(planOf({ complimentary: true, trialEndsAt: past, subscription: null, now: NOW }), "verslui");
  assert.equal(planOf({ complimentary: false, trialEndsAt: past, subscription: { status: "active", planId: "pro" }, now: NOW }), "pro");
  assert.equal(planOf({ complimentary: false, trialEndsAt: past, subscription: { status: "past_due", planId: "verslui" }, now: NOW }), "verslui");
  assert.equal(planOf({ complimentary: false, trialEndsAt: past, subscription: { status: "active", planId: null }, now: NOW }), "bazinis");
  assert.equal(planOf({ complimentary: false, trialEndsAt: future, subscription: null, now: NOW }), "pro");
  assert.equal(planOf({ complimentary: false, trialEndsAt: future, subscription: { status: "canceled", planId: "verslui" }, now: NOW }), "pro");
  assert.equal(planOf({ complimentary: false, trialEndsAt: past, subscription: { status: "canceled", planId: "pro" }, now: NOW }), null);
});

test("funkcijos pagal planą", () => {
  assert.equal(canUse("bazinis", "materials"), false);
  assert.equal(canUse("bazinis", "telegram"), false);
  assert.equal(canUse("pro", "cars"), true);
  assert.equal(canUse(null, "materials"), false);
  assert.equal(minPlanFor("telegram").id, "pro");
});

test("limitai: pasirinkti sprendimai (10 / 40 / 300, Telegram 0 / 300 / 5000, automobiliai 0 / 2 / 10)", () => {
  assert.deepEqual(limitOf("bazinis", "documents"), { value: 10, hard: true });
  assert.deepEqual(limitOf("pro", "documents"), { value: 40, hard: true });
  assert.deepEqual(limitOf("verslui", "documents"), { value: 300, hard: false });
  assert.deepEqual(limitOf("pro", "telegram"), { value: 300, hard: true });
  assert.deepEqual(limitOf("verslui", "telegram"), { value: 5000, hard: false });
  assert.equal(limitOf("pro", "cars")?.value, 2);
  assert.equal(limitOf("verslui", "cars")?.value, 10);
  assert.equal(limitOf("bazinis", "cars")?.value, 0);
});

test("usageLevel: 80 % ir 100 % ribos", () => {
  assert.equal(usageLevel(7, 10), "ok");
  assert.equal(usageLevel(8, 10), "warn");
  assert.equal(usageLevel(10, 10), "full");
  assert.equal(usageLevel(0, 0), "full");
  assert.equal(usageLevel(239, 300), "ok");
  assert.equal(usageLevel(240, 300), "warn");
});

// plans.ts turi sutapti su duomenų baze: tikriname migracijos plan_limits reikšmes.
test("plans.ts sutampa su 0022_plans.sql (plan_limits)", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/0022_plans.sql", import.meta.url), "utf8");
  const rows = [...sql.matchAll(/\('(bazinis|pro|verslui)',\s*'(documents|telegram|cars)',\s*(\d+),\s*(true|false)\)/g)];
  assert.equal(rows.length, 9, "turi būti 9 plan_limits eilutės");
  for (const [, plan, key, value, hard] of rows) {
    const l = limitOf(plan as "pro", key as "cars");
    assert.deepEqual(l, { value: Number(value), hard: hard === "true" }, `${plan}/${key}`);
  }
  assert.equal(PLANS.length, 3);
});

test("Paddle kainos ID → planas", () => {
  const env = { [priceEnvName("pro", "month")]: "pri_pro_m", [priceEnvName("verslui", "year")]: "pri_v_y" };
  assert.deepEqual(planFromPriceId("pri_pro_m", env), { plan: "pro", interval: "month" });
  assert.deepEqual(planFromPriceId("pri_v_y", env), { plan: "verslui", interval: "year" });
  assert.equal(planFromPriceId("pri_nezinomas", env), null);
  assert.equal(planFromPriceId(null, env), null);
  assert.equal(priceEnvName("bazinis", "year"), "PADDLE_PRICE_BAZINIS_YEARLY");
});
