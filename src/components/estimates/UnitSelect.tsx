"use client";

import { useEffect, useRef, useState } from "react";
import { UNITS } from "@/lib/estimates/calc";

const OTHER = "__other";

/** Parinktyje rodomi pilni pavadinimai, o sąmatoje saugoma trumpa santrumpa. */
export const UNIT_LABEL: Record<string, string> = {
  "vnt.": "vnt. – vienetai",
  m: "m – metrai",
  "m²": "m² – kv. metrai",
  "m³": "m³ – kub. metrai",
  kg: "kg – kilogramai",
  l: "l – litrai",
  "kompl.": "kompl. – komplektai",
  "pak.": "pak. – pakuotės",
  "rul.": "rul. – ritiniai",
  "por.": "por. – poros",
  "val.": "val. – valandos",
  "d.": "d. – dienos",
  paslauga: "paslauga",
};

/**
 * Vieneto pasirinkimas sąraše (vnt., m, kg, val. ir kt.) arba „Kita…“ savam vienetui.
 * Vienetas sąraše matomas iškart, o ne tik surinkus raides (kaip būtų su paprastu siūlymų laukeliu).
 */
export default function UnitSelect({ value, onChange, className }: { value: string; onChange: (unit: string) => void; className: string }) {
  const [other, setOther] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const known = UNITS.includes(value);

  // Kai vienetą pakeičia katalogo pasirinkimas, grįžtame prie sąrašo (nebent naudotojas dabar rašo savo).
  useEffect(() => {
    if (other && known && document.activeElement !== inputRef.current) setOther(false);
  }, [other, known, value]);

  const extra = !known && value && !other ? [value] : []; // katalogo vienetas, kurio nėra standartiniame sąraše

  return (
    <div className="space-y-2">
      <select
        value={other ? OTHER : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setOther(true);
            onChange("");
            setTimeout(() => inputRef.current?.focus(), 0);
          } else {
            setOther(false);
            onChange(v);
          }
        }}
        className={className}
      >
        {!value && !other && <option value="" disabled>Pasirinkite</option>}
        {[...extra, ...UNITS].map((u) => (
          <option key={u} value={u}>{UNIT_LABEL[u] ?? u}</option>
        ))}
        <option value={OTHER}>Kita…</option>
      </select>
      {other && (
        <input
          ref={inputRef}
          aria-label="Kitas vienetas"
          value={value}
          maxLength={20}
          placeholder="pvz. ryš."
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      )}
    </div>
  );
}
