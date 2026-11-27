import BillingPanel from "@/components/billing/BillingPanel";
import UsageMeter from "@/components/plans/UsageMeter";
import { requireContext } from "@/lib/auth/context";
import { paddleClientConfig } from "@/lib/billing/paddle";
import { getBilling } from "@/lib/billing/queries";
import { MIN_SEATS, planById } from "@/lib/plans";
import { getPlanUsage } from "@/lib/plans-usage";

export const dynamic = "force-dynamic";

const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)) : "–");
const money = (cents: number, currency: string) => new Intl.NumberFormat("lt-LT", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
const STATUS: Record<string, string> = { active: "Aktyvi", trialing: "Bandomasis laikotarpis", past_due: "Apmokėjimas nepavyko", paused: "Pristabdyta", canceled: "Atšaukta" };

export default async function AbonementasPage() {
  const ctx = await requireContext();
  const [b, usage] = await Promise.all([getBilling(ctx), getPlanUsage(ctx)]);
  const { token, env } = paddleClientConfig();
  const s = b.subscription;
  const live = !!s && ["active", "trialing", "past_due"].includes(s.status);
  const trialLeft = Math.ceil((new Date(ctx.company!.trialEndsAt).getTime() - Date.now()) / 86_400_000);
  const plan = planById(ctx.plan);
  const usedSeats = usage?.seats.used ?? b.activeMembers;
  const carsOver = usage && usage.cars.limit >= 0 && usage.cars.used > usage.cars.limit;

  return (
    <div className="space-y-4">
      <section className="rounded-card bg-white p-4 shadow-card sm:p-5">
        <h2 className="text-lg font-bold">Jūsų planas</h2>
        {s && live ? (
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Planas</dt><dd className="font-semibold">{plan?.name ?? "–"} · {s.interval === "year" ? "metinis" : s.interval === "month" ? "mėnesinis" : "–"} · {s.seats} darb.</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Būsena</dt><dd className={`font-semibold ${s.status === "past_due" ? "text-danger" : ""}`}>{STATUS[s.status] ?? s.status}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{s.cancelAtPeriodEnd ? "Galioja iki" : "Kitas apmokėjimas"}</dt><dd className="font-semibold">{date(s.currentPeriodEnd)}</dd></div>
          </dl>
        ) : ctx.company!.complimentary ? (
          <p className="mt-2 text-muted">Jūsų įmonei suteikta nemokama prieiga (Verslui plano funkcijos).</p>
        ) : trialLeft > 0 ? (
          <p className="mt-2 text-muted">Nemokamas bandymas su Pro plano funkcijomis: liko {trialLeft} d. Pasirinkite planą, kad prieiga nenutrūktų.</p>
        ) : (
          <p className="mt-2 text-muted">Bandomasis laikotarpis baigėsi. Pasirinkite planą.</p>
        )}
        {s?.cancelAtPeriodEnd && <p className="mt-2 text-sm font-medium text-amber-800">Prenumerata atšaukta ir nebus pratęsta.</p>}
        {s?.status === "past_due" && <p role="alert" className="mt-2 text-sm font-medium text-danger">Paskutinis apmokėjimas nepavyko. Atnaujinkite kortelę Paddle portale.</p>}
      </section>

      {usage && usage.plan && (
        <section className="space-y-3 rounded-card bg-white p-4 shadow-card sm:p-5">
          <h2 className="text-lg font-bold">Šio mėnesio naudojimas</h2>
          <UsageMeter label="Darbuotojų vietos" used={usage.seats.used} limit={usage.seats.limit} hard />
          {usage.seats.used >= usage.seats.limit && <p className="text-sm text-amber-800">Visos vietos užimtos: naujų narių pakviesti negalima. Padidinkite vietų skaičių žemiau.</p>}
          {usage.documents.limit > 0 && <UsageMeter label="Naujos sąmatos ir sutartys" used={usage.documents.used} limit={usage.documents.limit} hard={usage.documents.hard} />}
          {usage.telegram.limit > 0 ? (
            <UsageMeter label="Telegram žinutės" used={usage.telegram.used} limit={usage.telegram.limit} hard={usage.telegram.hard} />
          ) : (
            <p className="text-sm text-muted">Telegram: neįeina į jūsų planą.</p>
          )}
          {usage.cars.limit > 0 ? <UsageMeter label="Aktyvūs automobiliai" used={usage.cars.used} limit={usage.cars.limit} hard /> : <p className="text-sm text-muted">Automobiliai: neįeina į jūsų planą.</p>}
          {carsOver && <p className="text-sm text-amber-800">Aktyvių automobilių daugiau nei leidžia planas. Esami lieka, bet naujų pridėti ar išjungtų vėl įjungti nebus galima.</p>}
          <p className="text-xs text-muted">Limitai atsinaujina kalendorinio mėnesio pradžioje (Lietuvos laiku).</p>
        </section>
      )}

      <section className="rounded-card bg-white p-4 shadow-card sm:p-5">
        <h2 className="mb-3 text-lg font-bold">{live ? "Keisti planą" : "Pasirinkti planą"}</h2>
        <BillingPanel token={token} env={env} current={live ? { plan: s!.plan, interval: s!.interval, seats: s!.seats } : null} defaultSeats={Math.max(usedSeats, MIN_SEATS)} minSeats={usedSeats} />
      </section>

      {b.payments.length > 0 && (
        <section className="rounded-card bg-white p-4 shadow-card sm:p-5">
          <h2 className="mb-2 text-lg font-bold">Mokėjimai</h2>
          <ul className="divide-y divide-black/5">
            {b.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-muted">{date(p.paidAt ?? p.createdAt)}</span>
                <span className="font-semibold tabular-nums">{money(p.amountCents, p.currency)}</span>
                <span className={`text-sm font-semibold ${p.status === "paid" ? "text-go-dark" : "text-danger"}`}>{p.status === "paid" ? "Apmokėta" : p.status === "failed" ? "Nepavyko" : p.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
