import { carStatuses, type CarRow, type StatusLevel } from "@/lib/cars/logic";

// Spalva + simbolis, kad būseną matytų ir tas, kas spalvų neskiria.
const LEVEL: Record<StatusLevel, { box: string; text: string; mark: string }> = {
  expired: { box: "border-danger bg-red-50", text: "text-danger", mark: "✕ " },
  warn: { box: "border-amber-500 bg-amber-50", text: "text-amber-800", mark: "⚠ " },
  ok: { box: "border-go-dark bg-go-soft", text: "text-go-dark", mark: "✓ " },
  none: { box: "border-black/25 bg-surface", text: "text-muted", mark: "" },
};

/**
 * Techninė apžiūra, kelių mokestis, draudimas, tepalai, kilometražas.
 * Kompaktiški blokai: po du eilutėje telefone (po tris platesniame ekrane); problemos išplečiamos per visą
 * eilutę telefone ir rodomos šiek tiek didesniu šriftu.
 */
export default function CarStatusTiles({ car, today }: { car: CarRow; today: string }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {carStatuses(car, today).map((s) => {
        const st = LEVEL[s.level];
        const problem = s.level === "expired" || s.level === "warn";
        return (
          <div key={s.kind} className={`rounded-lg border-l-4 px-2.5 py-1.5 ${st.box} ${problem ? "col-span-2 sm:col-span-1" : ""}`}>
            <p className="text-[11px] font-bold leading-tight text-muted">{s.label}</p>
            <p className={`font-extrabold tabular-nums leading-tight text-ink ${problem ? "text-base" : "text-sm"}`}>{s.value}</p>
            <p className={`text-xs font-bold leading-tight ${st.text}`}>{st.mark}{s.detail}</p>
            {s.meta && <p className="text-[11px] font-medium leading-tight text-muted">{s.meta}</p>}
          </div>
        );
      })}
    </div>
  );
}
