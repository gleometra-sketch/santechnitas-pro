"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink } from "lucide-react";
import QtyStepper from "@/components/QtyStepper";
import { MAX_SEATS, type Interval } from "@/lib/billing/config";
import { changePlan, openBillingPortal, startCheckout } from "@/lib/billing/actions";
import { MIN_SEATS, PLANS, planById, type PlanId } from "@/lib/plans";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PaddleJs = { Environment: { set(env: string): void }; Initialize(opts: object): void; Checkout: { open(opts: object): void; close(): void } };
declare global { interface Window { Paddle?: PaddleJs } }

let loading: Promise<PaddleJs> | null = null;
let initialized = false;
let handler: (e: any) => void = () => {}; // dabartinio komponento įvykių tvarkytojas (Paddle inicializuojamas tik kartą)

/** Įkelia Paddle.js (tik kai reikia) ir vieną kartą jį inicializuoja. */
function loadPaddle(token: string, env: "sandbox" | "production"): Promise<PaddleJs> {
  if (!loading) {
    loading = new Promise<PaddleJs>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      s.async = true;
      s.onload = () => (window.Paddle ? resolve(window.Paddle) : reject(new Error("Paddle.js neįkeltas")));
      s.onerror = () => { loading = null; reject(new Error("Nepavyko įkelti Paddle.js")); };
      document.head.appendChild(s);
    });
  }
  return loading.then((p) => {
    if (!initialized) {
      if (env === "sandbox") p.Environment.set("sandbox");
      p.Initialize({ token, eventCallback: (e: any) => handler(e) });
      initialized = true;
    }
    return p;
  });
}

export type CurrentSub = { plan: PlanId | null; interval: Interval | null; seats: number } | null;

/**
 * Planas, darbuotojų skaičius ir apmokėjimas (Paddle). Su aktyvia prenumerata: plano / vietų keitimas ir Paddle portalas.
 * Apmokamų darbuotojų skaičius yra mažiausiai MIN_SEATS.
 */
export default function BillingPanel({ token, env, current, defaultSeats = MIN_SEATS, minSeats = MIN_SEATS }: { token: string; env: "sandbox" | "production"; current: CurrentSub; defaultSeats?: number; minSeats?: number }) {
  // Negalima pasirinkti mažiau vietų, nei dabar užimta (aktyvūs nariai ir laukiantys pakvietimai).
  const floor = Math.max(MIN_SEATS, minSeats);
  const router = useRouter();
  const live = !!current;
  const [plan, setPlan] = useState<PlanId>(current?.plan ?? "pro");
  const [interval, setInterval_] = useState<Interval>(current?.interval ?? "month");
  const clamp = (n: number) => Math.min(MAX_SEATS, Math.max(floor, n));
  const [seatsText, setSeatsText] = useState(String(clamp(current?.seats ?? defaultSeats)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const seats = Math.floor(Number(seatsText.replace(",", ".")));
  const seatsOk = Number.isInteger(seats) && seats >= floor && seats <= MAX_SEATS;
  const chosen = planById(plan)!;
  const unit = interval === "month" ? chosen.priceMonth : chosen.priceYear;
  const total = seatsOk ? seats * unit : 0;
  const unchanged = live && current!.plan === plan && current!.seats === seats;

  const refreshSoon = () => [2500, 6000, 12000].forEach((ms) => timers.current.push(setTimeout(() => router.refresh(), ms)));

  handler = (e: any) => {
    if (e?.name === "checkout.completed") {
      setInfo("Ačiū! Apmokėjimas gautas, prieiga aktyvuojama (tai gali užtrukti kelias sekundes).");
      setError("");
      refreshSoon();
    }
  };
  // Įkeliame iš anksto, kad apmokėjimo langas atsidarytų greitai ir veiktų Paddle apmokėjimo nuorodos (?_ptxn=...).
  useEffect(() => {
    if (token && !live) loadPaddle(token, env).catch(() => {});
  }, [token, env, live]);

  const pay = async () => {
    setError("");
    setInfo("");
    if (!token) return setError("Apmokėjimas dar nesukonfigūruotas (trūksta PADDLE_CLIENT_TOKEN).");
    if (!seatsOk) return setError(`Darbuotojų skaičius turi būti nuo ${floor} iki ${MAX_SEATS}.`);
    setBusy(true);
    const r = await startCheckout(plan, interval, seats);
    if (!r.ok) { setBusy(false); return setError(r.error); }
    try {
      const paddle = await loadPaddle(token, env);
      paddle.Checkout.open({ transactionId: r.transactionId, settings: { displayMode: "overlay" } });
    } catch {
      setError("Nepavyko atidaryti apmokėjimo lango. Patikrinkite interneto ryšį ir bandykite dar kartą.");
    }
    setBusy(false);
  };

  const change = async () => {
    setError("");
    setInfo("");
    if (!seatsOk) return setError(`Darbuotojų skaičius turi būti nuo ${floor} iki ${MAX_SEATS}.`);
    setBusy(true);
    const r = await changePlan(plan, seats);
    setBusy(false);
    if (r.ok) { setInfo(r.message); refreshSoon(); } else setError(r.error);
  };

  const manage = async () => {
    setError("");
    setBusy(true);
    const r = await openBillingPortal();
    if (r.ok) return window.location.assign(r.url);
    setBusy(false);
    setError(r.error);
  };

  return (
    <div>
      {!live && (
        <div role="radiogroup" aria-label="Apmokėjimo laikotarpis" className="mb-3 grid grid-cols-2 gap-2">
          {(["month", "year"] as const).map((i) => (
            <button key={i} type="button" role="radio" aria-checked={interval === i} onClick={() => setInterval_(i)} className={`min-h-12 rounded-2xl border-2 px-3 font-semibold ${interval === i ? "border-accent bg-accent-soft" : "border-black/10 bg-white"}`}>
              {i === "month" ? "Mėnesinis" : "Metinis (2 mėn. nemokamai)"}
            </button>
          ))}
        </div>
      )}

      <div role="radiogroup" aria-label="Planas" className="space-y-2">
        {PLANS.map((p) => {
          const price = interval === "month" ? p.priceMonth : p.priceYear;
          const on = plan === p.id;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPlan(p.id)} className={`w-full rounded-2xl border-2 p-3 text-left ${on ? "border-accent bg-accent-soft" : "border-black/10 bg-white"}`}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-bold">{p.name}{current?.plan === p.id && <span className="ml-2 rounded-full bg-go-soft px-2 text-xs font-semibold text-go-dark">Dabartinis</span>}</span>
                <span className="font-extrabold tabular-nums">{price} € <span className="text-xs font-normal text-muted">/ darb. {interval === "month" ? "per mėn." : "per metus"}</span></span>
              </span>
              <span className="mt-1 block text-sm text-muted">{p.tagline}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-medium">Darbuotojų skaičius <span className="text-xs font-normal text-muted">(nuo {floor})</span></span>
        <QtyStepper label="Darbuotojų skaičius" value={seatsText} onChange={setSeatsText} onStep={(t) => setSeatsText(String(clamp(Number(t) || floor)))} />
      </div>
      <p className="mt-3 text-lg font-extrabold">
        Iš viso: {seatsOk ? `${total} €` : "–"} <span className="text-sm font-normal text-muted">{interval === "month" ? "per mėnesį" : "per metus"} be PVM; galutinę sumą su PVM parodys apmokėjimo langas</span>
      </p>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
      {info && <p role="status" className="mt-2 text-sm font-medium text-go-dark">{info}</p>}

      {live ? (
        <div className="mt-3 grid gap-2">
          <button disabled={busy || unchanged} onClick={change} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-semibold text-white disabled:opacity-50">
            {busy ? "Keičiama..." : "Pakeisti planą"}
          </button>
          <button disabled={busy} onClick={manage} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/15 font-semibold disabled:opacity-60">
            <ExternalLink size={18} aria-hidden /> Tvarkyti prenumeratą (kortelė, sąskaitos, atšaukimas)
          </button>
          <p className="text-xs text-muted">Padidinus planą ar vietų skaičių skaičiuojama iškart proporcingai, sumažinus nuo kito apmokėjimo. Laikotarpio (mėnesinis / metinis) toje pačioje prenumeratoje keisti negalima.</p>
        </div>
      ) : (
        <>
          <button disabled={busy} onClick={pay} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-semibold text-white disabled:opacity-60">
            <CreditCard size={20} aria-hidden /> {busy ? "Kuriama..." : "Apmokėti"}
          </button>
          <p className="mt-2 text-xs text-muted">Mokėjimus apdoroja Paddle (pardavėjas teisiškai yra Paddle). Prenumeratą galėsite atšaukti bet kada (galioja iki apmokėto laikotarpio pabaigos). <a href="/grazinimai" className="font-semibold underline">Atšaukimas ir grąžinimai</a>, <a href="/salygos" className="font-semibold underline">sąlygos</a>.</p>
        </>
      )}
    </div>
  );
}
