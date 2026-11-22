import { usageLevel } from "@/lib/plans";

const TONE = { ok: "bg-accent", warn: "bg-amber-500", full: "bg-danger" } as const;

/** Naudojimo juosta: „7 / 10“. Spalva ir tekstas keičiasi artėjant prie limito (80 %, 100 %). */
export default function UsageMeter({ label, used, limit, hard, unit = "" }: { label: string; used: number; limit: number; hard: boolean; unit?: string }) {
  const level = usageLevel(used, limit);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums font-semibold">
          {used} / {limit}
          {unit}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)} aria-label={label}>
        <div className={`h-full rounded-full ${TONE[level]}`} style={{ width: `${pct}%` }} />
      </div>
      {level === "warn" && <p className="mt-1 text-sm font-medium text-amber-800">Artėjate prie limito.</p>}
      {level === "full" && <p className="mt-1 text-sm font-medium text-danger">{hard ? "Limitas pasiektas." : "Pasiekta sąžiningo naudojimo riba."}</p>}
    </div>
  );
}
