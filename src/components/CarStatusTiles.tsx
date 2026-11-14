import { carStatuses, type CarRow, type StatusLevel } from "@/lib/cars/logic";

// Spalva + simbolis, kad būseną matytų ir tas, kas spalvų neskiria.
const LEVEL: Record<StatusLevel, { box: string; text: string; mark: string }> = {
  expired: { box: "border-danger bg-red-50", text: "text-danger", mark: "✕ " },
  warn: { box: "border-amber-500 bg-amber-50", text: "text-amber-800", mark: "⚠ " },
  ok: { box: "border-go-dark bg-go-soft", text: "text-go-dark", mark: "✓ " },
  none: { box: "border-black/25 bg-surface", text: "text-muted", mark: "" },
};

/** Stambūs, spalvoti blokai: techninė apžiūra, kelių mokestis, draudimas, tepalai, kilometražas. */
export default function CarStatusTiles({ car, today }: { car: CarRow; today: string }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {carStatuses(car, today).map((s) => {
        const st = LEVEL[s.level];
        return (
          <div key={s.kind} className={`rounded-xl border-l-8 px-3 py-2.5 ${st.box}`}>
            <p className="text-sm font-bold uppercase tracking-wide text-ink">{s.label}</p>
            <p className="mt-0.5 text-xl font-extrabold tabular-nums text-ink">{s.value}</p>
            <p className={`text-base font-bold ${st.text}`}>{st.mark}{s.detail}</p>
            {s.meta && <p className="mt-0.5 text-sm font-medium text-muted">{s.meta}</p>}
          </div>
        );
      })}
    </div>
  );
}
