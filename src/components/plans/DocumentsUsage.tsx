import Link from "next/link";
import UsageMeter from "@/components/plans/UsageMeter";
import { getPlanUsage } from "@/lib/plans-usage";
import type { SessionContext } from "@/lib/auth/context";

/** Šio mėnesio naujų sąmatų ir sutarčių skaitiklis (administratoriui). Neparodomas, jei duomenų nėra. */
export default async function DocumentsUsage({ ctx }: { ctx: SessionContext }) {
  const u = await getPlanUsage(ctx);
  if (!u || u.documents.limit <= 0) return null;
  return (
    <section className="rounded-2xl bg-white p-3 shadow-card">
      <UsageMeter label="Naujos sąmatos ir sutartys šį mėnesį" used={u.documents.used} limit={u.documents.limit} hard={u.documents.hard} />
      <p className="mt-2 text-xs text-muted">
        Skaičiuojamas naujas dokumentas (kopija taip pat), kai jis pirmą kartą išsaugomas su turiniu. Redagavimas ir siuntimas nieko nenaudoja.{" "}
        <Link href="/valdymas/abonementas" className="font-semibold text-accent-dark underline">Planai</Link>
      </p>
    </section>
  );
}
