import Link from "next/link";
import { Lock } from "lucide-react";
import { minPlanFor, type Feature } from "@/lib/plans";

const NAME: Record<Feature, string> = { materials: "Medžiagų užsakymai", cars: "Automobiliai", telegram: "Telegram pranešimai" };

/** Rodoma vietoje skilties, kurios nėra įmonės plane. */
export default function UpgradeNotice({ feature, admin }: { feature: Feature; admin: boolean }) {
  const min = minPlanFor(feature);
  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <span aria-hidden className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-dark"><Lock size={22} /></span>
      <h1 className="text-xl font-extrabold">{NAME[feature]} prieinami nuo plano „{min.name}“</h1>
      {admin ? (
        <>
          <p className="mt-2 text-muted">Jūsų plane šios skilties nėra. Pasirinkite aukštesnį planą, ir ji iškart atsiras.</p>
          <Link href="/valdymas/abonementas" className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-white">Peržiūrėti planus</Link>
        </>
      ) : (
        <p className="mt-2 text-muted">Susisiekite su savo įmonės administratoriumi.</p>
      )}
    </section>
  );
}
