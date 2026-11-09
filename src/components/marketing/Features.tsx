import { FEATURES } from "./featureList";

export default function Features() {
  return (
    <section id="funkcijos" className="mx-auto max-w-[1200px] scroll-mt-4 px-5 py-20 sm:px-8 sm:py-24">
      <h2 className="font-display text-4xl font-bold tracking-tight sm:text-[44px]">Viskas, ko reikia objektų darbams</h2>
      <p className="mb-12 mt-3 max-w-2xl text-lg text-muted">Funkcijos, kurios pakeičia popierius, Excel lenteles ir skambučius tarp biuro ir objekto.</p>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-2xl border-2 border-navy p-7">
            <span aria-hidden className={`mb-5 block h-3 w-3 rounded-full ${f.tone === "blue" ? "bg-accent" : "bg-brand-red"}`} />
            <h3 className="mb-2.5 font-display text-2xl font-bold">{f.title}</h3>
            <p className="leading-relaxed text-muted">{f.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
