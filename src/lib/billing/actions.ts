"use server";

import { createClient } from "@/lib/supabase/server";
import { getActionContext, isAdmin } from "@/lib/auth/context";
import { MIN_SEATS, PLAN_ORDER, isPlanId, planById } from "@/lib/plans";
import { MAX_SEATS, priceIdFor, type Interval } from "./config";
import { paddleApiBase } from "./paddle";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

async function adminGuard() {
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!ctx.companyId) return fail("Pirmiausia sukurkite įmonę.");
  if (!isAdmin(ctx.role)) return fail("Apmokėjimus tvarkyti gali tik administratorius.");
  return { companyId: ctx.companyId };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Paddle klaida žmogaus kalba: administratorius mato, ką taisyti (Paddle klaidų tekste slaptų duomenų nėra). */
function paddleErrorText(status: number, code: string, detail: string): string {
  const tail = [code, detail].filter(Boolean).join(": ");
  let hint = "Nepavyko susisiekti su apmokėjimo sistema. Bandykite dar kartą.";
  if (status === 401 || code.startsWith("authentication")) hint = "Paddle atmetė API raktą. Patikrinkite PADDLE_API_KEY (ar jis iš tos pačios aplinkos kaip PADDLE_ENV, ar neatšauktas).";
  else if (status === 403 || code === "forbidden") hint = "API raktas neturi teisių. Paddle → Developer tools → Authentication: raktui suteikite transakcijų (write), prenumeratų ir klientų portalo teises.";
  else if (status === 404 || code === "entity_not_found") hint = "Paddle nerado objekto. Patikrinkite kainos ID (turi būti pri_..., ne pro_...) ir ar jis iš sandbox, kai PADDLE_ENV=sandbox.";
  else if (code.includes("default_checkout_url")) hint = "Paddle → Checkout → Checkout settings: nustatykite Default payment link (pvz. https://jūsų-adresas/valdymas/abonementas).";
  else if (status >= 400 && status < 500) hint = "Paddle atmetė užklausą. Patikrinkite kainos nustatymus (kiekis: mažiausiai 3, daugiausiai 500).";
  return tail ? `${hint} (Paddle: ${tail})` : hint;
}

async function paddleFetch(method: "POST" | "PATCH", path: string, body: unknown): Promise<{ ok: true; data: any } | Fail> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) return fail("Apmokėjimas dar nesukonfigūruotas (trūksta PADDLE_API_KEY).");
  try {
    const res = await fetch(`${paddleApiBase()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Paddle-Version": "1" },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok || !json?.data) {
      const code = String(json?.error?.code ?? "");
      const detail = String(json?.error?.detail ?? "").slice(0, 300);
      console.error("Paddle API klaida:", method, path, res.status, JSON.stringify(json?.error ?? json));
      return fail(paddleErrorText(res.status, code, detail));
    }
    return { ok: true, data: json.data };
  } catch (e) {
    console.error("Paddle API ryšio klaida:", e);
    return fail("Nepavyko susisiekti su apmokėjimo sistema. Bandykite dar kartą.");
  }
}

function checkChoice(plan: unknown, interval: unknown, seats: unknown): { plan: (typeof PLAN_ORDER)[number]; interval: Interval; seats: number } | Fail {
  if (!isPlanId(plan)) return fail("Neteisingas planas.");
  if (interval !== "month" && interval !== "year") return fail("Neteisingas laikotarpis.");
  if (typeof seats !== "number" || !Number.isInteger(seats) || seats < MIN_SEATS || seats > MAX_SEATS) return fail(`Darbuotojų skaičius turi būti nuo ${MIN_SEATS} iki ${MAX_SEATS}.`);
  return { plan, interval, seats };
}

/** Užimtos vietos: aktyvūs nariai ir laukiantys pakvietimai (kaip 0023_seats.sql). */
async function seatsInUse(db: Awaited<ReturnType<typeof createClient>>, companyId: string): Promise<number> {
  const { count } = await db.from("company_members").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("status", ["invited", "active"]);
  return count ?? 0;
}
const seatsTooFew = (used: number) => fail(`Šiuo metu užimta ${used} vietų (aktyvūs nariai ir laukiantys pakvietimai). Pasirinkite bent ${used} arba pirmiausia pašalinkite narius skiltyje Darbuotojai.`);

/**
 * Sukuria Paddle transakciją SERVERYJE (įmonės ID įrašomas čia, o ne naršyklėje, kad jo nebūtų galima pakeisti),
 * o naršyklė ją atidaro kaip apmokėjimo langą. Kiekis = darbuotojų (apmokamų vietų) skaičius.
 */
export async function startCheckout(plan: string, interval: string, seats: number): Promise<{ ok: true; transactionId: string } | Fail> {
  const c = checkChoice(plan, interval, seats);
  if ("ok" in c) return c;
  const g = await adminGuard();
  if ("ok" in g) return g;

  const priceId = priceIdFor(c.plan, c.interval);
  if (!priceId) return fail("Šio plano apmokėjimas dar nesukonfigūruotas (trūksta kainos ID).");

  const db = await createClient();
  const used = await seatsInUse(db, g.companyId);
  if (c.seats < used) return seatsTooFew(used);
  const { data: sub } = await db.from("subscriptions").select("status, provider_customer_id").eq("company_id", g.companyId).maybeSingle();
  if (sub && ["active", "trialing", "past_due"].includes(sub.status as string)) {
    return fail("Prenumerata jau aktyvi. Planą keiskite mygtuku „Pakeisti planą“.");
  }

  const r = await paddleFetch("POST", "/transactions", {
    items: [{ price_id: priceId, quantity: c.seats }],
    custom_data: { company_id: g.companyId },
    ...(sub?.provider_customer_id ? { customer_id: sub.provider_customer_id } : {}),
  });
  if (!r.ok) return r;
  if (typeof r.data.id !== "string") return fail("Apmokėjimo sistema grąžino netikėtą atsakymą.");
  return { ok: true, transactionId: r.data.id };
}

/**
 * Keičia esamos prenumeratos planą ar darbuotojų skaičių (laikotarpis lieka tas pats: Paddle neleidžia jo keisti toje pačioje
 * prenumeratoje). Padidinus planą ar vietas skaičiuojama iškart (proporcingai), sumažinus nuo kito apmokėjimo.
 * Naują būseną į duomenų bazę įrašo Paddle webhook, todėl pakeitimas matomas po kelių sekundžių.
 * ĮSPĖJIMAS: šis Paddle API iškvietimas dar neišbandytas su tikru Paddle (žr. docs/PADDLE.md); pirmiausia tikrinkite sandbox.
 */
export async function changePlan(plan: string, seats: number): Promise<{ ok: true; message: string } | Fail> {
  const g = await adminGuard();
  if ("ok" in g) return g;
  const db = await createClient();
  const { data: sub } = await db.from("subscriptions").select("provider_subscription_id, status, plan_id, plan_interval, seats").eq("company_id", g.companyId).maybeSingle();
  if (!sub?.provider_subscription_id || !["active", "trialing", "past_due"].includes(sub.status as string)) return fail("Aktyvios prenumeratos nėra.");
  const interval = sub.plan_interval as Interval | null;
  if (interval !== "month" && interval !== "year") return fail("Nepavyko nustatyti dabartinio laikotarpio.");
  const c = checkChoice(plan, interval, seats);
  if ("ok" in c) return c;
  const used = await seatsInUse(db, g.companyId);
  if (c.seats < used) return seatsTooFew(used);

  const priceId = priceIdFor(c.plan, c.interval);
  if (!priceId) return fail("Šio plano apmokėjimas dar nesukonfigūruotas (trūksta kainos ID).");
  const currentPlan = isPlanId(sub.plan_id) ? sub.plan_id : "bazinis";
  if (currentPlan === c.plan && sub.seats === c.seats) return fail("Niekas nepakeista.");

  const upgrade = PLAN_ORDER.indexOf(c.plan) > PLAN_ORDER.indexOf(currentPlan) || c.seats > (sub.seats as number);
  const r = await paddleFetch("PATCH", `/subscriptions/${encodeURIComponent(sub.provider_subscription_id as string)}`, {
    items: [{ price_id: priceId, quantity: c.seats }],
    proration_billing_mode: upgrade ? "prorated_immediately" : "prorated_next_billing_period",
  });
  if (!r.ok) return r;
  return { ok: true, message: `Planas keičiamas į „${planById(c.plan)?.name}“, ${c.seats} darb. Pakeitimas atsiras po kelių sekundžių.` };
}

/** Nuoroda į Paddle klientų portalą (kortelė, sąskaitos, atšaukimas). Nuoroda laikina, todėl kuriama kiekvieną kartą. */
export async function openBillingPortal(): Promise<{ ok: true; url: string } | Fail> {
  const g = await adminGuard();
  if ("ok" in g) return g;
  const db = await createClient();
  const { data: sub } = await db.from("subscriptions").select("provider_customer_id, provider_subscription_id").eq("company_id", g.companyId).maybeSingle();
  if (!sub?.provider_customer_id) return fail("Prenumeratos dar nėra.");
  const r = await paddleFetch("POST", `/customers/${encodeURIComponent(sub.provider_customer_id as string)}/portal-sessions`, {
    subscription_ids: sub.provider_subscription_id ? [sub.provider_subscription_id] : [],
  });
  if (!r.ok) return r;
  const url = r.data?.urls?.general?.overview;
  if (typeof url !== "string" || !url.startsWith("https://")) return fail("Nepavyko gauti portalo nuorodos.");
  return { ok: true, url };
}
