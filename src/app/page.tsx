import Link from "next/link";
import Logo from "@/components/Logo";
import Features from "@/components/marketing/Features";
import Pricing from "@/components/marketing/Pricing";

export const metadata = {
  title: "DarboRitmas – objektų kalendorius ir darbo laiko apskaita",
  description: "Planuokite darbus objektuose, leiskite darbuotojams telefonu žymėti laiką ir užsakyti medžiagas. 14 dienų nemokamai, be banko kortelės.",
};

const bars = [
  { w: "w-[62%]", ml: "", bg: "bg-accent", label: "Objektas 1" },
  { w: "w-[56%]", ml: "ml-[22%]", bg: "bg-brand-red", label: "Objektas 2" },
  { w: "w-[60%]", ml: "ml-[40%]", bg: "bg-navy", label: "Objektas 3" },
  { w: "w-[38%]", ml: "", bg: "bg-accent", label: "Objektas 4" },
];

export default function Landing() {
  return (
    <div className="bg-white text-navy">
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link href="/" aria-label="DarboRitmas – pradžia"><Logo size={44} /></Link>
        <nav aria-label="Pagrindinis" className="flex flex-wrap items-center gap-x-7 gap-y-2 font-semibold">
          <a href="#funkcijos" className="text-accent hover:text-accent-dark">Funkcijos</a>
          <a href="#kainos" className="text-accent hover:text-accent-dark">Kainos</a>
          <Link href="/prisijungimas" className="text-accent hover:text-accent-dark">Prisijungti</Link>
          <Link href="/registracija" className="rounded-[10px] bg-navy px-5 py-3 text-white hover:bg-navy-700">Išbandyti</Link>
        </nav>
      </header>

      <main>
        <section className="flex flex-wrap items-stretch">
          <div className="box-border flex-[1_1_480px] bg-accent px-5 pb-20 pt-16 text-white sm:px-14 sm:pb-24 sm:pt-20">
            <p className="mb-6 inline-block rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold">Darbo objektų kalendorius ir laiko apskaita</p>
            <h1 className="mb-6 font-display text-[40px] font-bold leading-[1.04] tracking-[-0.025em] sm:text-6xl">
              Visi objektai viename kalendoriuje. Kiekviena valanda –{" "}
              <span className="rounded-lg bg-navy px-3">apskaityta.</span>
            </h1>
            <p className="mb-9 max-w-[540px] text-lg leading-relaxed sm:text-xl">
              Planuokite darbus objektuose, leiskite darbuotojams telefone žymėti laiką ir užsakyti medžiagas. Be Excel lentelių ir skambučių.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/registracija" className="rounded-xl bg-white px-7 py-4 text-lg font-semibold text-navy hover:bg-surface">Išbandyti DarboRitmą</Link>
              <a href="#funkcijos" className="rounded-xl border-2 border-white px-7 py-3.5 text-lg font-semibold text-white hover:bg-white/10">Kaip veikia</a>
            </div>
          </div>

          <div className="box-border flex flex-[1_1_420px] items-center bg-brand-red px-5 py-16 sm:px-14 sm:py-20">
            <div aria-hidden className="w-full rounded-2xl border-[3px] border-navy bg-white p-6 shadow-[10px_10px_0_#0B1B3F]">
              <div className="mb-4 flex justify-between text-sm font-bold text-muted"><span>Pr</span><span>An</span><span>Tr</span><span>Kt</span><span>Pn</span></div>
              <div className="space-y-3">
                {bars.map((b) => (
                  <div key={b.label} className={b.ml}>
                    <div className={`${b.w} ${b.bg} rounded-[10px] px-4 py-3.5 font-semibold text-white`}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Features />
        <Pricing />

        <section className="flex flex-wrap text-white">
          <div className="box-border flex flex-[1_1_480px] items-center bg-accent px-5 py-16 sm:px-14 sm:py-[72px]">
            <h2 className="max-w-[640px] font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-[44px]">Sudėliokite komandos darbus į vieną ritmą.</h2>
          </div>
          <div className="box-border flex flex-[1_1_360px] items-center bg-brand-red px-5 py-14 sm:px-14 sm:py-[72px]">
            <Link href="/registracija" className="rounded-xl bg-white px-8 py-[18px] text-lg font-semibold text-navy hover:bg-surface">Išbandyti DarboRitmą</Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-muted sm:px-8">
        <Logo size={28} />
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/privatumas" className="hover:underline">Privatumo politika</Link>
          <Link href="/prisijungimas" className="hover:underline">Prisijungti</Link>
          <span>© DarboRitmas</span>
        </span>
      </footer>
    </div>
  );
}
