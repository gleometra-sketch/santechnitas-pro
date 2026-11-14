"use client";

import { X } from "lucide-react";
import MicButton from "@/components/MicButton";
import QtyStepper from "@/components/QtyStepper";
import { UNITS } from "@/lib/work/types";

export type LineValue = { name: string; qty: string; unit: (typeof UNITS)[number] };

/**
 * Viena medžiagos eilutė: pavadinimas (rašomas arba diktuojamas), po juo kiekis su rodyklėmis
 * (▲ virš skaičiaus, ▼ žemiau) ir šalia vienetų langelis.
 */
export default function MaterialLine({
  index,
  value,
  onChange,
  onRemove,
  onVoice,
  onError,
}: {
  index: number;
  value: LineValue;
  onChange: (patch: Partial<LineValue>) => void;
  onRemove?: () => void;
  onVoice?: () => void;
  onError?: (message: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 p-3">
      <div className="flex items-center gap-2">
        <input
          aria-label={`Medžiaga ${index + 1}`}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Medžiaga (rašykite arba diktuokite)"
          maxLength={200}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-black/15 px-3 text-base"
        />
        <MicButton
          label={`Diktuoti medžiagą ${index + 1}`}
          onError={onError}
          onText={(t) => {
            if (!t) return;
            onChange({ name: value.name.trim() ? `${value.name.trim()} ${t}` : t });
            onVoice?.();
          }}
        />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <QtyStepper label={`Kiekis ${index + 1}`} value={value.qty} onChange={(t) => onChange({ qty: t })} onStep={(t) => onChange({ qty: t })} />
        <select
          aria-label={`Vienetas ${index + 1}`}
          value={value.unit}
          onChange={(e) => onChange({ unit: e.target.value as LineValue["unit"] })}
          className="h-14 w-24 rounded-xl border-2 border-black/20 bg-white px-2 text-center text-lg font-bold"
        >
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <span className="flex-1" />
        {onRemove && (
          <button type="button" aria-label={`Pašalinti medžiagą ${index + 1}`} onClick={onRemove} className="flex h-12 w-12 items-center justify-center rounded-xl border border-black/10">
            <X size={18} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
