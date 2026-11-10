import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { StaleEntry } from "@/lib/admin/types";
import { toLocalInput } from "@/lib/dates";
import { STALE_ENTRY_HOURS } from "@/lib/work/types";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

/** Įspėjimas apie neuždarytus darbo laiko įrašus (greičiausiai darbuotojas pamiršo „Baigti“). */
export default function StaleAlert({ entries }: { entries: StaleEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section role="alert" className="rounded-card border border-brand-red/30 bg-white p-4 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-bold text-brand-red"><AlertTriangle size={20} aria-hidden /> Neuždaryti darbo laiko įrašai</h2>
      <p className="mt-1 text-sm text-muted">Šie darbuotojai greičiausiai pamiršo paspausti „Baigti“. Suvestinėje jų laikas skaičiuojamas ne ilgiau kaip {STALE_ENTRY_HOURS} val., todėl įrašykite tikrą pabaigą.</p>
      <ul className="mt-3 space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate"><strong>{e.name}</strong> · pradėta {fmt(e.startedAt)}</span>
            <Link href={`/valdymas/laikas?d=${e.userId}&m=${toLocalInput(e.startedAt).slice(0, 7)}`} className="flex min-h-11 shrink-0 items-center rounded-xl border border-black/15 px-4 font-semibold">Taisyti</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
