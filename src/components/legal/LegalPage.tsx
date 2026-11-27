import Link from "next/link";
import { LEGAL_UPDATED, legalMissing, type Legal } from "@/lib/legal";

/** Bendras juridinių puslapių rėmas: antraštė, nuorodos tarp puslapių ir įspėjimas, jei neužpildyti įmonės rekvizitai. */
export default function LegalPage({ title, legal, children }: { title: string; legal: Legal; children: React.ReactNode }) {
  const missing = legalMissing(legal);
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8 leading-relaxed">
      {missing.length > 0 && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-danger">
          Neužpildyti įmonės rekvizitai ({missing.join(", ")}). Prieš viešą paleidimą nustatykite juos Cloudflare kintamuosiuose (docs/JURIDINIAI.md).
        </p>
      )}
      <nav aria-label="Juridiniai dokumentai" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/salygos" className="font-semibold text-accent-dark underline">Naudojimo sąlygos</Link>
        <Link href="/grazinimai" className="font-semibold text-accent-dark underline">Atšaukimas ir grąžinimai</Link>
        <Link href="/privatumas" className="font-semibold text-accent-dark underline">Privatumo politika</Link>
      </nav>
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
      <p className="text-sm text-muted">Atnaujinta: {LEGAL_UPDATED}</p>
      {children}
      <p className="pt-2"><Link href="/" className="font-semibold text-accent-dark underline">Į pradžią</Link></p>
    </main>
  );
}

export const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="pt-2 text-xl font-bold">{children}</h2>;
