"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteTimeEntry, saveTimeEntry } from "@/lib/admin/actions";
import type { TimeRow } from "@/lib/admin/types";
import { formatDuration, toLocalInput } from "@/lib/dates";
import type { ActionResult } from "@/lib/work/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "./ui";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

function EntryForm({ userId, entry, defaultDay, onDone }: { userId: string; entry: TimeRow | null; defaultDay: string; onDone: (m: { ok: boolean; text: string } | null) => void }) {
  const [start, setStart] = useState(entry ? toLocalInput(entry.startedAt) : `${defaultDay}T08:00`);
  const [end, setEnd] = useState(entry?.endedAt ? toLocalInput(entry.endedAt) : entry ? "" : `${defaultDay}T17:00`);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, begin] = useTransition();
  const save = () =>
    begin(async () => {
      const r = await saveTimeEntry(entry?.id ?? null, { userId, start, end });
      if (r.ok) onDone({ ok: true, text: r.message ?? "Išsaugota." });
      else setMsg({ ok: false, text: r.error });
    });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pradžia"><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} /></Field>
        <Field label="Pabaiga"><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} /></Field>
      </div>
      <Msg msg={msg} />
      <div className="flex gap-2">
        <button disabled={pending} onClick={save} className={`${primaryBtn} flex-1`}>{pending ? "Saugoma..." : "Išsaugoti"}</button>
        <button disabled={pending} onClick={() => onDone(null)} className={ghostBtn}>Atšaukti</button>
      </div>
    </div>
  );
}

function EntryRow({ e, userId, onMsg }: { e: TimeRow; userId: string; onMsg: (m: { ok: boolean; text: string } | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const del = () => {
    if (!window.confirm("Ištrinti šį laiko įrašą?")) return;
    start(async () => {
      const r: ActionResult = await deleteTimeEntry(e.id);
      onMsg(r.ok ? { ok: true, text: r.message ?? "Ištrinta." } : { ok: false, text: r.error });
    });
  };
  return (
    <li className="rounded-card bg-white p-5 shadow-card">
      {editing ? (
        <EntryForm userId={userId} entry={e} defaultDay={toLocalInput(e.startedAt).slice(0, 10)} onDone={(m) => { setEditing(false); if (m) onMsg(m); }} />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{fmt(e.startedAt)} – {e.endedAt ? fmt(e.endedAt) : "vyksta"}</p>
            <p className="text-muted">Dirbta: {formatDuration(e.minutes)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} aria-label="Redaguoti įrašą" className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-black/10"><Pencil size={18} aria-hidden /></button>
            <button disabled={pending} onClick={del} aria-label="Ištrinti įrašą" className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-black/10 text-danger"><Trash2 size={18} aria-hidden /></button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function TimeAdmin({ userId, entries, defaultDay }: { userId: string; entries: TimeRow[]; defaultDay: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const total = entries.reduce((s, e) => s + e.minutes, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between rounded-card bg-white p-5 shadow-card">
        <span>Iš viso per mėnesį</span>
        <strong>{formatDuration(total)}</strong>
      </div>
      <Msg msg={msg} />
      {adding ? (
        <section className="rounded-card bg-white p-5 shadow-card">
          <EntryForm userId={userId} entry={null} defaultDay={defaultDay} onDone={(m) => { setAdding(false); setMsg(m); }} />
        </section>
      ) : (
        <button onClick={() => setAdding(true)} className={`${ghostBtn} flex w-full items-center justify-center gap-2`}><Plus size={18} aria-hidden /> Pridėti laiko įrašą</button>
      )}
      {entries.length === 0 && <p className="text-muted">Šį mėnesį įrašų nėra.</p>}
      <ul className="space-y-3">{entries.map((e) => <EntryRow key={e.id} e={e} userId={userId} onMsg={setMsg} />)}</ul>
    </div>
  );
}
