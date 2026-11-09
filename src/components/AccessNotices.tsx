import { CreditCard, Sparkles } from "lucide-react";
import { isAdmin, type SessionContext } from "@/lib/auth/context";

const TRIAL_DAYS = 14;

/** Informacija administratoriui apie likusį bandymo laiką. */
export function TrialBanner({ ctx }: { ctx: SessionContext }) {
  if (!ctx.company || ctx.subscribed || ctx.company.complimentary || !isAdmin(ctx.role)) return null;
  const msLeft = new Date(ctx.company.trialEndsAt).getTime() - Date.now();
  if (msLeft <= 0) return null;
  const days = Math.ceil(msLeft / 86_400_000);
  const word = days === 1 ? "diena" : days % 10 === 0 || (days >= 11 && days <= 19) ? "dienų" : "dienos";
  const pct = Math.max(4, Math.min(100, (days / TRIAL_DAYS) * 100));
  return (
    <div
      role="status"
      className="relative mb-4 overflow-hidden rounded-card bg-gradient-to-br from-navy to-navy-700 p-4 text-white shadow-card"
    >
      <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent-light/30 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">Nemokamas bandymas</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
            Pilna prieiga be banko kortelės
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white/10 px-3 py-1.5 text-center leading-none ring-1 ring-white/15">
          <span className="block text-2xl font-extrabold text-accent-light">{days}</span>
          <span className="mt-1 block text-[11px] uppercase tracking-wide text-white/70">{word}</span>
        </div>
      </div>
      <div aria-hidden className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-gradient-to-r from-accent-light to-brand-red-light" style={{ width: `${pct}%` }} />
      </div>
      <span className="sr-only">Liko {days} {word}</span>
    </div>
  );
}

/** Rodoma vietoje turinio, kai įmonė neturi prieigos. Apmokėjimas (Stripe Checkout) bus pridėtas 7 etape. */
export function AccessExpired({ ctx }: { ctx: SessionContext }) {
  const admin = isAdmin(ctx.role);
  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <h1 className="text-2xl font-extrabold">{admin ? "Nemokamas bandymas baigėsi" : "Įmonės prieiga sustabdyta"}</h1>
      {admin ? (
        <>
          <p className="mt-2 text-muted">Jūsų duomenys išsaugoti. Pasirinkite planą ir darbuotojų skaičių, kad tęstumėte darbą.</p>
          <ul className="mt-4 space-y-2">
            <li className="rounded-2xl border border-black/10 p-4"><strong>Mėnesinis:</strong> 3 € už darbuotoją per mėnesį</li>
            <li className="rounded-2xl border border-black/10 p-4"><strong>Metinis:</strong> 29 € už darbuotoją per metus</li>
          </ul>
          <button disabled className="mt-4 min-h-14 w-full rounded-2xl bg-accent text-lg font-semibold text-white opacity-60">
            Apmokėjimas bus pridėtas 7 etape
          </button>
        </>
      ) : (
        <p className="mt-2 text-muted">Susisiekite su savo įmonės administratoriumi. Jūsų duomenys išsaugoti.</p>
      )}
    </section>
  );
}
