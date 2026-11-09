"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Mic, NotebookPen, Trash2 } from "lucide-react";
import { addNote, deleteNote, toggleNote } from "@/lib/work/actions";
import type { ActionResult, NoteView } from "@/lib/work/types";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export default function OfficeNote({ notes }: { notes: NoteView[] }) {
  const [text, setText] = useState("");
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const recRef = useRef<SpeechRec | null>(null);

  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        onOk?.();
      } else setError(r.error);
    });

  const send = () => {
    if (!text.trim()) return setError("Įrašykite pastabą prieš siųsdami.");
    run(() => addNote(text, voiceUsed ? "voice" : "text"), () => {
      setText("");
      setVoiceUsed(false);
    });
  };

  const voice = () => {
    if (listening) return recRef.current?.stop();
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return setError("Šioje naršyklėje balso įvedimas nepalaikomas. Rašykite tekstu.");
    setError("");
    const rec = new Ctor();
    rec.lang = "lt-LT";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const spoken = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setText((prev) => (prev ? prev + " " : "") + spoken);
      setVoiceUsed(true);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setError("Nepavyko įrašyti balso. Patikrinkite mikrofono leidimą.");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
        <NotebookPen size={22} aria-hidden /> Pastaba biurui
      </h2>
      <label htmlFor="office-note" className="sr-only">Pastaba biurui</label>
      <textarea
        id="office-note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Pvz.: pakeistas radiatoriaus tipas, klientas prašo skambinti..."
        className="w-full resize-none rounded-2xl border border-black/15 p-3 text-base placeholder:text-muted/70 focus:border-accent focus:outline-none"
      />
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={voice}
          aria-pressed={listening}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border font-semibold ${listening ? "border-danger bg-red-50 text-danger" : "border-black/15 bg-white"}`}
        >
          <Mic size={20} aria-hidden /> {listening ? "Klausau..." : "Balsu"}
        </button>
        <button disabled={pending} onClick={send} className="min-h-14 rounded-2xl bg-accent text-lg font-semibold text-white active:bg-accent-dark disabled:opacity-60">
          {pending ? "Siunčiama..." : "Siųsti"}
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="mt-4 divide-y divide-black/5">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 py-2">
              <span className={`min-w-0 break-words ${n.isDone ? "text-muted line-through" : ""}`}>{n.body}</span>
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
