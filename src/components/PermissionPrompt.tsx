"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

const ASKED_KEY = "dr-mic-asked";
const LATER_KEY = "dr-mic-later";

const safe = {
  get: (s: "local" | "session", k: string) => { try { return (s === "local" ? localStorage : sessionStorage).getItem(k); } catch { return null; } },
  set: (s: "local" | "session", k: string, v: string) => { try { (s === "local" ? localStorage : sessionStorage).setItem(k, v); } catch { /* privatus režimas */ } },
};

/**
 * Pirmą kartą prisijungus paprašo mikrofono leidimo (balso įvedimui pastabose ir medžiagose).
 * Naršyklė leidimo prašo tik po paspaudimo, todėl rodomas aiškus langas su mygtuku „Leisti mikrofoną“.
 * Jei leidimas jau duotas ar užblokuotas, nerodoma nieko (užblokuotą leidimą paaiškina pats mikrofono mygtukas).
 */
export default function PermissionPrompt() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    if (safe.get("local", ASKED_KEY) === "1" || safe.get("session", LATER_KEY) === "1") return;
    let cancelled = false;
    (async () => {
      try {
        const st = await navigator.permissions?.query({ name: "microphone" as PermissionName });
        if (cancelled) return;
        if (st && st.state !== "prompt") return; // jau leista arba užblokuota
      } catch {
        // Permissions API nepalaikomas (pvz. iPhone) – rodome langą vieną kartą.
      }
      if (!cancelled) setOpen(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const allow = async () => {
    setBusy(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      safe.set("local", ASKED_KEY, "1");
      setOpen(false);
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        safe.set("local", ASKED_KEY, "1");
        setError("Leidimas nesuteiktas. Jį galite įjungti telefono ar naršyklės nustatymuose (svetainės leidimai → Mikrofonas).");
      } else if (name === "NotFoundError") {
        setError("Šiame įrenginyje mikrofono nerasta. Rašykite tekstu.");
      } else {
        setError("Nepavyko įjungti mikrofono. Bandykite dar kartą.");
      }
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    safe.set("session", LATER_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="mic-title">
      <div className="w-full max-w-sm rounded-card bg-white p-5 shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
          <Mic size={24} aria-hidden />
        </div>
        <h2 id="mic-title" className="mt-3 text-lg font-bold">Leiskite mikrofoną</h2>
        <p className="mt-1 text-muted">Galėsite pastabas ir medžiagas padiktuoti balsu, o ne rašyti. Įrašas naudojamas tik tada, kai paspaudžiate mikrofono mygtuką.</p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-4 grid gap-2">
          <button disabled={busy} onClick={allow} className="min-h-12 rounded-2xl bg-accent font-semibold text-white disabled:opacity-60">
            {busy ? "Laukiama..." : error ? "Bandyti dar kartą" : "Leisti mikrofoną"}
          </button>
          <button onClick={later} className="min-h-12 rounded-2xl border border-black/15 font-semibold">
            {error ? "Uždaryti" : "Ne dabar"}
          </button>
        </div>
      </div>
    </div>
  );
}
