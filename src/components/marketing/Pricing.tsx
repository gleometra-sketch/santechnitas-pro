import Link from "next/link";
import { MIN_SEATS, PLANS } from "@/lib/plans";

export default function Pricing() {
  return (
    <section id="kainos" className="scroll-mt-4 bg-surface">
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-24">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[44px]">Abonementai</h2>
        <p className="mb-8 mt-3 max-w-2xl text-lg text-muted sm:mb-12">
          14 dienų išbandykite nemokamai su Pro plano funkcijomis, be banko kortelės. Kaina už vieną darbuotoją (nuo {MIN_SEATS} darbuotojų), be PVM. Planą keiskite bet kada.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] items-stretch gap-6">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col rounded-2xl border-2 border-navy p-6 sm:p-8 ${p.highlight ? "bg-navy text-white shadow-[6px_6px_0_#D92D20] sm:shadow-[10px_10px_0_#D92D20]" : "bg-white"}`}
            >
              <h3 className="mb-1 font-display text-[26px] font-bold">{p.name}</h3>
              <p className={`mb-4 text-sm ${p.highlight ? "text-sky" : "text-muted"}`}>{p.tagline}</p>
              <div className="font-display text-[40px] font-bold leading-tight">
                {p.priceMonth} €<span className={`text-base font-medium ${p.highlight ? "text-sky" : "text-muted"}`}> / darb. per mėn.</span>
              </div>
              <p className={`mb-6 text-sm ${p.highlight ? "text-sky" : "text-muted"}`}>arba {p.priceYear} € per metus (2 mėn. nemokamai)</p>
              <ul className="mb-7 flex-1 space-y-2.5">
                {p.bullets.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link
                href="/registracija"
                className={`block rounded-[10px] px-4 py-3.5 text-center font-semibold ${
                  p.highlight ? "bg-brand-red text-white hover:bg-[#b8241a]" : "border-2 border-accent text-accent hover:bg-accent-soft"
                }`}
              >
                Išbandyti nemokamai
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">Apmokėjimus apdoroja Paddle. Telegram žinutės skaičiuojamos kiekvienam gavėjui; programos pranešimai neribojami visuose planuose.</p>
      </div>
    </section>
  );
}
