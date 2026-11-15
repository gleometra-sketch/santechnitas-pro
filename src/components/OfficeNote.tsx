"use client";

import { useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import MicButton from "@/components/MicButton";
import { composeNote } from "@/lib/work/noteText";
import { addNote, deleteNote, toggleNote } from "@/lib/work/actions";
import type { ActionResult, NoteView } from "@/lib/work/types";

/**
 * Pastaba biurui: tik teksto laukas ir mikrofonas. Kiekių ir vienetų čia nėra:
 * juos biuras suveda skiltyje Medžiagos, kai pastaba ten nukeliauja.
 */
export default function OfficeNote({ notes }: { notes: NoteView[] }) {
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

  const send = () => {
    const composed = composeNote([], text);
    if ("error" in composed) return setError(composed.error);
    run(() => addNote(composed.body, voiceUsed ? "voice" : "text"), () => {
      setText("");
      setVoiceUsed(false);
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm text-muted">Parašykite arba padiktuokite, ko reikia. Kiekius ir vienetus biuras suves pats.</p>
      <label htmlFor="office-note" className="sr-only">Pastaba biurui</label>
      <textarea
        id="office-note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Pvz.: reikia 2 m vamzdžio, 4 movų, klientas prašo skambinti..."
        className="w-full resize-none rounded-2xl border border-black/15 p-3 text-base placeholder:text-muted/70 focus:border-accent focus:outline-none"
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
                <button disabled={pending} onClick={() => run(() => toggleNote(n.id, !n.isDone))} aria-pressed={n.isDone} aria-label={n.isDone ? "Grąžinti pastabą" : "Pažymėti pastabą atlikta"} className="flex min-h-11 items-center gap-1 rounded-xl px-2 font-medium">
                  <Check size={20} aria-hidden /> <span className="hidden min-[400px]:inline">atlikta</span>
                </button>
                <button disabled={pending} onClick={() => run(() => deleteNote(n.id))} aria-label="Ištrinti pastabą" className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10">
                  <Trash2 size={18} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
