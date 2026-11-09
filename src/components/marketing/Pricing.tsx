import Link from "next/link";
import { PLANS } from "@/lib/plans";

export default function Pricing() {
  return (
    <section id="kainos" className="scroll-mt-4 bg-surface">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-[44px]">Abonementai</h2>
        <p className="mb-12 mt-3 max-w-2xl text-lg text-muted">14 dienų išbandykite nemokamai, be banko kortelės. Kaina skaičiuojama už kiekvieną darbuotoją.</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-stretch gap-6">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col rounded-2xl border-2 border-navy p-8 ${p.highlight ? "bg-navy text-white shadow-[10px_10px_0_#D92D20]" : "bg-white"}`}
            >
              <h3 className="mb-2 font-display text-[26px] font-bold">{p.name}</h3>
              <div className="mb-2 font-display text-[40px] font-bold leading-tight">
                {p.price} €<span className={`text-base font-medium ${p.highlight ? "text-sky" : "text-muted"}`}> {p.per}</span>
              </div>
              {p.note && <p className={`mb-6 text-sm ${p.highlight ? "text-sky" : "text-muted"}`}>{p.note}</p>}
              <ul className="mb-7 flex-1 space-y-2.5">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link
                href="/registracija"
                className={`block rounded-[10px] px-4 py-3.5 text-center font-semibold ${
                  p.highlight ? "bg-brand-red text-white hover:bg-[#b8241a]" : "border-2 border-accent text-accent hover:bg-accent-soft"
                }`}
              >
                Išbandyti 14 dienų nemokamai
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
