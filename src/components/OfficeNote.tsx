"use client";

import { useState, useTransition } from "react";
import { Check, NotebookPen, Plus, Trash2 } from "lucide-react";
import MaterialLine, { type LineValue } from "@/components/MaterialLine";
import MicButton from "@/components/MicButton";
import { composeNote } from "@/lib/work/noteText";
import { addNote, deleteNote, toggleNote } from "@/lib/work/actions";
import type { ActionResult, NoteView } from "@/lib/work/types";

type Row = LineValue & { key: number };
const newRow = (key: number): Row => ({ key, name: "", qty: "1", unit: "vnt." });

export default function OfficeNote({ notes }: { notes: NoteView[] }) {
  const [rows, setRows] = useState<Row[]>([newRow(1)]);
  const [text, setText] = useState("");
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        onOk?.();
      } else setError(r.error);
    });

  const patch = (key: number, p: Partial<LineValue>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const send = () => {
    const composed = composeNote(rows, text);
    if ("error" in composed) return setError(composed.error);
    run(() => addNote(composed.body, voiceUsed ? "voice" : "text"), () => {
      setRows([newRow(Date.now())]);
      setText("");
      setVoiceUsed(false);
    });
  };

  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
        <NotebookPen size={22} aria-hidden /> Pastaba biurui
      </h2>
      <p className="mb-3 text-sm text-muted">Įrašykite, ko reikia (rašykite arba diktuokite), kiekį keiskite rodyklėmis. Biuras pastabą mato skiltyje Medžiagos.</p>
      <div className="space-y-3">
        {rows.map((r, idx) => (
          <MaterialLine
            key={r.key}
            index={idx}
            value={r}
            onChange={(p) => patch(r.key, p)}
            onRemove={rows.length > 1 ? () => setRows((all) => all.filter((x) => x.key !== r.key)) : undefined}
            onVoice={() => setVoiceUsed(true)}
            onError={setError}
          />
        ))}
        <button type="button" onClick={() => setRows((all) => [...all, newRow(Date.now())])} className="flex min-h-11 items-center gap-1 font-semibold text-accent-dark">
          <Plus size={18} aria-hidden /> Pridėti dar vieną medžiagą
        </button>
      </div>

      <label htmlFor="office-note" className="mt-3 block text-sm font-medium text-muted">Kita pastaba (nebūtina)</label>
      <textarea
        id="office-note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder="Pvz.: pakeistas radiatoriaus tipas, klientas prašo skambinti..."
        className="mt-1 w-full resize-none rounded-2xl border border-black/15 p-3 text-base placeholder:text-muted/70 focus:border-accent focus:outline-none"
      />
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MicButton large onError={setError} onText={(t) => { if (!t) return; setText((prev) => (prev ? prev + " " : "") + t); setVoiceUsed(true); }} />
        <button disabled={pending} onClick={send} className="min-h-14 rounded-2xl bg-accent text-lg font-semibold text-white active:bg-accent-dark disabled:opacity-60">
          {pending ? "Siunčiama..." : "Siųsti"}
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="mt-4 divide-y divide-black/5">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 py-2">
              <span className={`min-w-0 whitespace-pre-wrap break-words ${n.isDone ? "text-muted line-through" : ""}`}>{n.body}</span>
              <span className="flex shrink-0 items-center gap-1">
                <button disabled={pending} onClick={() => run(() => toggleNote(n.id, !n.isDone))} aria-pressed={n.isDone} className="flex min-h-11 items-center gap-1 rounded-xl px-2 font-medium">
                  <Check size={20} aria-hidden /> atlikta
                </button>
                <button disabled={pending} onClick={() => run(() => deleteNote(n.id))} aria-label="Ištrinti pastabą" className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10">
                  <Trash2 size={18} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
