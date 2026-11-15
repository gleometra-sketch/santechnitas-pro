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
 * Telefone: tvarkingi blokai rodomi po du viename eilutėje, o problemos (pasibaigę ar artėjantys terminai)
 * išplečiamos per visą plotį ir didesniu šriftu.
 */
export default function CarStatusTiles({ car, today }: { car: CarRow; today: string }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {carStatuses(car, today).map((s) => {
        const st = LEVEL[s.level];
        const problem = s.level === "expired" || s.level === "warn";
        return (
          <div key={s.kind} className={`rounded-xl border-l-8 px-3 py-2 ${st.box} ${problem ? "col-span-2" : ""}`}>
            <p className="text-xs font-bold text-muted">{s.label}</p>
            <p className={`mt-0.5 font-extrabold tabular-nums text-ink ${problem ? "text-xl" : "text-base leading-snug"}`}>{s.value}</p>
            <p className={`font-bold ${st.text} ${problem ? "text-base" : "text-sm leading-snug"}`}>{st.mark}{s.detail}</p>
            {s.meta && <p className="mt-0.5 text-xs font-medium text-muted">{s.meta}</p>}
          </div>
        );
      })}
    </div>
  );
}
