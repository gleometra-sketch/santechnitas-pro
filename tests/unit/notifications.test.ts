import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { EVENTS, eventDef, type EventType } from "../../src/lib/notifications/events";
import { isCategory } from "../../src/lib/telegram/core";
import { isQuietNow, notify } from "../../src/lib/notifications/notify";

/* Mažas Supabase klientas testams: grandinė from().select().eq()... grąžina eilutes pagal lentelę. */
type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>) {
  const inserted: Record<string, Row[]> = {};
  const deleted: string[] = [];
  const client = {
    inserted,
    deleted,
    from(name: string) {
      let rows = tables[name] ?? [];
      const b: any = {
        select: () => b,
        eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return b; },
        limit: () => b,
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        insert: (v: Row | Row[]) => { (inserted[name] ??= []).push(...(Array.isArray(v) ? v : [v])); return Promise.resolve({ error: null }); },
        delete: () => { deleted.push(name); return b; },
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(res),
      };
      return b;
    },
  };
  return client;
}

const CO = "c1";
const status = (log: { channel: string; status: string }[], ch: string) => log.find((l) => l.channel === ch)?.status;

let sent: { chat: number; text: string }[] = [];
beforeEach(() => {
  sent = [];
  process.env.TELEGRAM_BOT_TOKEN = "test";
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    const b = JSON.parse(init?.body ?? "{}");
    sent.push({ chat: b.chat_id, text: b.text });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
});

const admin = (muted: string[] = []) => ({
  company_members: [{ company_id: CO, user_id: "adm", status: "active", role: "owner" }],
  telegram_links: [{ company_id: CO, user_id: "adm", chat_id: 777, muted }],
});

test("isQuietNow: naktinis langas 21:00–07:00 pagal Lietuvos laiką", () => {
  const at = (iso: string) => new Date(iso);
  assert.equal(isQuietNow("21:00", "07:00", "Europe/Vilnius", at("2026-01-10T20:30:00Z")), true); // 22:30 vietos laiku
  assert.equal(isQuietNow("21:00", "07:00", "Europe/Vilnius", at("2026-01-10T09:00:00Z")), false); // 11:00
  assert.equal(isQuietNow("21:00", "07:00", "Europe/Vilnius", at("2026-01-10T04:00:00Z")), true); // 06:00
  assert.equal(isQuietNow(null, null, "Europe/Vilnius"), false);
});

test("įvykių sąrašas: kategorijos tinkamos, nėra dvigubų Telegram žinučių", () => {
  for (const key of Object.keys(EVENTS) as EventType[]) {
    const d = eventDef(key);
    if (d.telegramCategory) assert.ok(isCategory(d.telegramCategory), key);
    if (d.defaults.includes("telegram")) assert.ok(d.adminOnly || d.telegramCategory, `${key}: Telegram be kategorijos ar adminOnly`);
  }
  // Medžiagų poreikį į Telegram siunčia src/lib/telegram/notify.ts: čia jo būti negali.
  assert.ok(!eventDef("material_request").defaults.includes("telegram"));
});

test("administratorius gauna automobilio terminą programoje ir Telegram", async () => {
  const db = fakeDb(admin());
  const log = await notify(db as never, { companyId: CO, userId: "adm", event: "car_deadline", payload: { title: "TA baigiasi", body: "ABC123 <7 d." } });
  assert.equal(status(log, "inapp"), "sent");
  assert.equal(status(log, "telegram"), "sent");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].chat, 777);
  assert.ok(sent[0].text.includes("&lt;7 d."), "HTML ištrintas");
  assert.equal(db.inserted["notifications"].length, 1);
});

test("administratorius išjungė automobilių kategoriją botu: Telegram praleidžiamas", async () => {
  const db = fakeDb(admin(["automobiliai"]));
  const log = await notify(db as never, { companyId: CO, userId: "adm", event: "car_oil", payload: { title: "Tepalai", body: "" } });
  assert.equal(status(log, "inapp"), "sent");
  assert.equal(status(log, "telegram"), "skipped");
  assert.equal(sent.length, 0);
});

test("darbuotojas (ne administratorius) Telegram negauna, net jei turi prijungimą", async () => {
  const db = fakeDb({
    company_members: [{ company_id: CO, user_id: "w", status: "active", role: "worker" }],
    telegram_links: [{ company_id: CO, user_id: "w", chat_id: 5, muted: [] }],
  });
  const log = await notify(db as never, { companyId: CO, userId: "w", event: "car_deadline", payload: { title: "TA", body: "" } });
  assert.equal(status(log, "inapp"), "sent");
  assert.equal(log.find((l) => l.channel === "telegram"), undefined);
  assert.equal(sent.length, 0);
});

test("ne įmonės narys negauna nieko", async () => {
  const db = fakeDb({ company_members: [] });
  assert.deepEqual(await notify(db as never, { companyId: CO, userId: "x", event: "task_assigned", payload: { title: "a", body: "b" } }), []);
  assert.equal(db.inserted["notifications"], undefined);
});

test("medžiagų prašymas: administratoriui tik programoje (Telegram siunčia atskiras kelias)", async () => {
  const db = fakeDb(admin());
  const log = await notify(db as never, { companyId: CO, userId: "adm", event: "material_request", payload: { title: "Naujas", body: "x" } });
  assert.equal(status(log, "inapp"), "sent");
  assert.equal(log.find((l) => l.channel === "telegram"), undefined);
  assert.equal(sent.length, 0);
});

test("užblokavus botą prijungimas pašalinamas, o nesėkmė užfiksuojama", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ description: "Forbidden: bot was blocked by the user" }), { status: 403 })) as typeof fetch;
  const db = fakeDb(admin());
  const log = await notify(db as never, { companyId: CO, userId: "adm", event: "car_deadline", payload: { title: "TA", body: "" } });
  assert.equal(status(log, "telegram"), "failed");
  assert.ok(db.deleted.includes("telegram_links"));
});

test("Telegram limitas pasiektas: Telegram praleidžiamas, programos pranešimas vis tiek išsiunčiamas", async () => {
  const db = fakeDb(admin());
  (db as unknown as { rpc: unknown }).rpc = async () => ({ data: { allowed: false, reason: "limit", used: 300, limit: 300 }, error: null });
  const log = await notify(db as never, { companyId: CO, userId: "adm", event: "car_deadline", payload: { title: "TA baigiasi", body: "ABC123" } });
  assert.equal(status(log, "inapp"), "sent");
  assert.equal(status(log, "telegram"), "skipped");
  assert.equal(sent.length, 0);
  assert.equal(db.inserted["notifications"].length, 1);
});

test("Telegram limitas leidžia: žinutė išsiunčiama ir kvota prašoma su kategorija", async () => {
  const db = fakeDb(admin());
  const calls: unknown[] = [];
  (db as unknown as { rpc: unknown }).rpc = async (name: string, args: unknown) => { calls.push({ name, args }); return { data: { allowed: true, used: 1, limit: 300 }, error: null }; };
  const log = await notify(db as never, { companyId: CO, userId: "adm", event: "car_oil", payload: { title: "Tepalai", body: "" } });
  assert.equal(status(log, "telegram"), "sent");
  assert.deepEqual(calls, [{ name: "take_telegram_quota", args: { p_company: CO, p_category: "automobiliai", p_priority: "high" } }]);
});

test("dokumentų pranešimus Telegram galima išjungti kategorija „dokumentai“", async () => {
  const db = fakeDb(admin(["dokumentai"]));
  const log = await notify(db as never, { companyId: CO, userId: "adm", event: "document_status", payload: { title: "Sąmata patvirtinta", body: "" } });
  assert.equal(status(log, "inapp"), "sent");
  assert.equal(status(log, "telegram"), "skipped");
  assert.equal(sent.length, 0);
});
