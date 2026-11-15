"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respondToDocument } from "@/lib/documents/actions";
import { KIND_GEN, type DocKind } from "@/lib/documents/logic";

const field = "mt-1 min-h-12 w-full rounded-xl border border-black/15 bg-white px-3";

export default function PublicActions({ token, kind, canRespond }: { token: string; kind: DocKind; canRespond: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "decline" | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const label = KIND_GEN[kind];

  const submit = (decision: "approved" | "declined") =>
    start(async () => {
      const r = await respondToDocument({ token, decision, name, note });
      setMsg(r.ok ? { ok: true, text: r.message ?? "Išsaugota." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-4 print:hidden">
      <button onClick={() => window.print()} className="min-h-12 w-full rounded-2xl border border-black/15 bg-white px-4 font-semibold">Spausdinti arba išsaugoti kaip PDF</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-2xl p-3 font-medium ${msg.ok ? "bg-go-soft text-go-dark" : "bg-red-50 text-danger"}`}>{msg.text}</p>}
      {canRespond && !msg?.ok && (
        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-xl font-bold">Jūsų sprendimas</h2>
          {!mode && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => setMode("approve")} className="min-h-14 rounded-2xl bg-accent px-5 text-lg font-semibold text-white">Patvirtinti</button>
              <button onClick={() => setMode("decline")} className="min-h-14 rounded-2xl border border-black/15 px-5 text-lg font-semibold">Atmesti</button>
            </div>
          )}
          {mode === "approve" && (
            <div className="space-y-3">
              <label className="block"><span className="text-sm font-medium text-muted">Jūsų vardas ir pavardė</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} /></label>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5" />
                <span>Susipažinau su {label} sąlygomis ir sutinku su jomis.</span>
              </label>
              <label className="block"><span className="text-sm font-medium text-muted">Pastaba (neprivaloma)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${field} min-h-0 py-2`} /></label>
              <div className="flex gap-3">
                <button disabled={pending || !agree || name.trim().length < 3} onClick={() => submit("approved")} className="min-h-12 rounded-2xl bg-accent px-5 font-semibold text-white disabled:opacity-60">{pending ? "Saugoma..." : "Patvirtinti"}</button>
                <button disabled={pending} onClick={() => setMode(null)} className="min-h-12 rounded-2xl border border-black/15 px-4 font-semibold">Atgal</button>
              </div>
              <p className="text-xs text-muted">Patvirtinimas išsaugomas su jūsų vardu, data ir laiku.</p>
            </div>
          )}
          {mode === "decline" && (
            <div className="space-y-3">
              <label className="block"><span className="text-sm font-medium text-muted">Priežastis (neprivaloma)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${field} min-h-0 py-2`} /></label>
              <div className="flex gap-3">
                <button disabled={pending} onClick={() => submit("declined")} className="min-h-12 rounded-2xl bg-accent px-5 font-semibold text-white disabled:opacity-60">{pending ? "Saugoma..." : "Atmesti"}</button>
                <button disabled={pending} onClick={() => setMode(null)} className="min-h-12 rounded-2xl border border-black/15 px-4 font-semibold">Atgal</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
