import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { takeTelegramQuota } from "../../src/lib/telegram/quota";
import { telegramPriority } from "../../src/lib/telegram/core";

const fake = (res: { data?: unknown; error?: { message: string } | null }, calls: unknown[] = []) =>
  ({ rpc: async (name: string, args: unknown) => { calls.push({ name, args }); return { data: res.data ?? null, error: res.error ?? null }; } }) as unknown as SupabaseClient;

test("telegramPriority: darbo žinutės mažiausiai svarbios", () => {
  assert.equal(telegramPriority("darbas"), "low");
  for (const c of ["medziagos", "pastabos", "automobiliai", "dokumentai", "kita"]) assert.equal(telegramPriority(c), "high");
});

test("takeTelegramQuota: perduoda kategoriją ir prioritetą, gerbia atsisakymą", async () => {
  const calls: unknown[] = [];
  const denied = await takeTelegramQuota(fake({ data: { allowed: false, reason: "low_priority_paused", used: 240, limit: 300 } }, calls), "c1", "darbas");
  assert.deepEqual(denied, { allowed: false, reason: "low_priority_paused", used: 240, limit: 300 });
  assert.deepEqual(calls[0], { name: "take_telegram_quota", args: { p_company: "c1", p_category: "darbas", p_priority: "low" } });
  assert.equal((await takeTelegramQuota(fake({ data: { allowed: true, used: 1, limit: 300 } }), "c1", "pastabos")).allowed, true);
});

test("takeTelegramQuota: techninė klaida ar trūkstama funkcija neblokuoja pranešimų", async () => {
  assert.equal((await takeTelegramQuota(fake({ error: { message: "function not found" } }), "c1", "pastabos")).allowed, true);
  assert.equal((await takeTelegramQuota({} as unknown as SupabaseClient, "c1", "pastabos")).allowed, true);
  assert.equal((await takeTelegramQuota(fake({ data: "keista" }), "c1", "pastabos")).allowed, true);
});
