"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import QtyStepper from "@/components/QtyStepper";
import { addMaterialsFromNote } from "@/lib/work/actions";
import { UNITS } from "@/lib/work/types";

type Line = { key: number; name: string; qty: string; unit: string };

/**
 * Administratorius čia pastabos tekstą išskaido į medžiagas ir nurodo kiekį bei vienetą.
 * Kiekvienas pastabos tekstas pradžioje tampa atskira eilute – tereikia pataisyti.
 */
export default function NoteToMaterials({ noteId, body, onSaved }: { noteId: string; body: string; onSaved: () => void }) {
  const [lines, setLines] = useState<Line[]>(() => {
    const names = body.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20);
    return (names.length ? names : [""]).map((name, i) => ({ key: i + 1, name, qty: "1", unit: "vnt." }));
  });
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const patch = (key: number, p: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const save = () => {
    const items: { name: string; quantity: number; unit: string }[] = [];
    for (const l of lines) {
      const name = l.name.trim();
      if (!name) continue;
      const q = Number(l.qty.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) return setErr(`Neteisingas kiekis: „${name}“.`);
      items.push({ name, quantity: q, unit: l.unit });
    }
    if (items.length === 0) return setErr("Įrašykite bent vieną medžiagą.");
    setErr("");
    start(async () => {
      const r = await addMaterialsFromNote(noteId, items);
      if (r.ok) onSaved();
      else setErr(r.error);
    });
  };

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-white p-3 ring-1 ring-black/10">
      <p className="text-sm text-muted">Nurodykite medžiagas, kiekį ir vienetą. Jos atsiras trūkstamų sąraše, o pastaba bus pažymėta atlikta.</p>
      {lines.map((l, idx) => (
        <div key={l.key} className="space-y-2 rounded-xl border border-black/10 p-2.5">
          <input
            aria-label={`Medžiaga ${idx + 1}`}
            value={l.name}
            maxLength={200}
            onChange={(e) => patch(l.key, { name: e.target.value })}
            placeholder="Medžiagos pavadinimas"
            className="min-h-12 w-full rounded-xl border border-black/15 px-3 text-base"
          />
          <div className="flex flex-wrap items-center gap-2">
            <QtyStepper label={`Kiekis ${idx + 1}`} value={l.qty} onChange={(t) => patch(l.key, { qty: t })} onStep={(t) => patch(l.key, { qty: t })} />
            <select aria-label={`Vienetas ${idx + 1}`} value={l.unit} onChange={(e) => patch(l.key, { unit: e.target.value })} className="h-11 w-[4.75rem] rounded-xl border border-black/15 bg-white px-1 text-center font-bold">
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
            {lines.length > 1 && (
              <button type="button" aria-label={`Pašalinti eilutę ${idx + 1}`} onClick={() => setLines((all) => all.filter((x) => x.key !== l.key))} className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-black/10">
                <X size={18} aria-hidden />
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setLines((all) => [...all, { key: Date.now(), name: "", qty: "1", unit: "vnt." }])} className="flex min-h-11 items-center gap-1 font-semibold text-accent-dark">
        <Plus size={18} aria-hidden /> Pridėti eilutę
      </button>
      {err && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}
      <button disabled={pending} onClick={save} className="min-h-12 w-full rounded-2xl bg-accent font-semibold text-white disabled:opacity-60">
        {pending ? "Saugoma..." : "Įtraukti į medžiagų sąrašą"}
      </button>
    </div>
  );
}
