"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { stepQty } from "@/lib/work/qty";

const arrow = "flex h-9 w-full items-center justify-center rounded-lg border border-black/15 bg-white text-ink active:bg-accent-soft disabled:opacity-30";

/** Kiekis su rodyklėmis: ▲ virš skaičiaus, ▼ po juo. Skaičių vis tiek galima įrašyti ranka. */
export default function QtyStepper({
  value,
  onChange,
  onStep,
  onCommit,
  label = "Kiekis",
  disabled = false,
}: {
  value: string;
  onChange: (text: string) => void; // žmogus rašo ranka
  onStep: (next: string) => void; // paspaustos rodyklės
  onCommit?: () => void; // laukas prarado fokusą / Enter
  label?: string;
  disabled?: boolean;
}) {
  const up = stepQty(value, 1);
  const down = stepQty(value, -1);
  return (
    <div className="flex w-20 shrink-0 flex-col items-stretch gap-1">
      <button type="button" disabled={disabled || up === null} onClick={() => up && onStep(up)} aria-label={`${label}: padidinti`} className={arrow}>
        <ChevronUp size={20} aria-hidden />
      </button>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        onFocus={(e) => e.currentTarget.select()}
        placeholder="0"
        className="h-11 w-full min-w-0 rounded-lg border border-black/15 bg-white px-1 text-center text-lg font-extrabold tabular-nums focus:border-accent focus:outline-none"
      />
      <button type="button" disabled={disabled || down === null} onClick={() => down && onStep(down)} aria-label={`${label}: sumažinti`} className={arrow}>
        <ChevronDown size={20} aria-hidden />
      </button>
    </div>
  );
}
