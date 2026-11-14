"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** Balso įvedimas (lietuvių k.). Gautą tekstą perduoda per onText; klaidas – per onError. */
export default function MicButton({
  onText,
  onError,
  label = "Įrašyti balsu",
  large = false,
}: {
  onText: (text: string) => void;
  onError?: (message: string) => void;
  label?: string;
  large?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  const toggle = () => {
    if (listening) return recRef.current?.stop();
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return onError?.("Šioje naršyklėje balso įvedimas nepalaikomas. Rašykite tekstu.");
    onError?.("");
    const rec = new Ctor();
    rec.lang = "lt-LT";
    rec.interimResults = false;
    rec.onresult = (e) => onText(Array.from(e.results).map((r) => r[0].transcript).join(" ").trim());
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      onError?.("Nepavyko įrašyti balso. Patikrinkite mikrofono leidimą.");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const state = listening ? "border-danger bg-red-50 text-danger" : "border-black/15 bg-white text-ink";
  if (large) {
    return (
      <button type="button" onClick={toggle} aria-pressed={listening} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border font-semibold ${state}`}>
        <Mic size={20} aria-hidden /> {listening ? "Klausau..." : "Balsu"}
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={listening} aria-label={listening ? "Sustabdyti įrašymą" : label} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${state}`}>
      <Mic size={22} aria-hidden />
    </button>
  );
}
