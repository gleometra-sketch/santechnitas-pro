"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteTimeEntry, saveTimeEntry } from "@/lib/admin/actions";
import type { TimeRow } from "@/lib/admin/types";
import { formatDuration, toLocalInput } from "@/lib/dates";
import type { ActionResult } from "@/lib/work/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "./ui";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

type Proj = { id: string; name: string };

function EntryForm({ userId, entry, defaultDay, projects, onDone }: { userId: string; entry: TimeRow | null; defaultDay: string; projects: Proj[]; onDone: (m: { ok: boolean; text: string } | null) => void }) {
  const [pid, setPid] = useState(entry?.projectId ?? "");
  const [start, setStart] = useState(entry ? toLocalInput(entry.startedAt) : `${defaultDay}T08:00`);
  const [end, setEnd] = useState(entry?.endedAt ? toLocalInput(entry.endedAt) : entry ? "" : `${defaultDay}T17:00`);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, begin] = useTransition();
  const save = () =>
    begin(async () => {
      const r = await saveTimeEntry(entry?.id ?? null, { userId, start, end, projectId: pid || null });
      if (r.ok) onDone({ ok: true, text: r.message ?? "Išsaugota." });
      else setMsg({ ok: false, text: r.error });
    });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pradžia"><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} /></Field>
        <Field label="Pabaiga"><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} /></Field>
      </div>
      {entry && !entry.endedAt && <p className="text-sm font-medium text-danger">Šis įrašas neuždarytas. Įrašykite tikrą darbo pabaigą.</p>}
      <Field label="Objektas">
        <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputCls}>
          <option value="">Be objekto</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Msg msg={msg} />
      <div className="flex gap-2">
        <button disabled={pending} onClick={save} className={`${primaryBtn} flex-1`}>{pending ? "Saugoma..." : "Išsaugoti"}</button>
        <button disabled={pending} onClick={() => onDone(null)} className={ghostBtn}>Atšaukti</button>
      </div>
    </div>
  );
}

function EntryRow({ e, userId, projects, locked, onMsg }: { e: TimeRow; userId: string; projects: Proj[]; locked: boolean; onMsg: (m: { ok: boolean; text: string } | null) => void }) {
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
        <EntryForm userId={userId} entry={e} projects={projects} defaultDay={toLocalInput(e.startedAt).slice(0, 10)} onDone={(m) => { setEditing(false); if (m) onMsg(m); }} />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{fmt(e.startedAt)} – {e.endedAt ? fmt(e.endedAt) : "vyksta"}{e.stale && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-danger">Neuždarytas</span>}</p>
            <p className="text-muted">Dirbta: {formatDuration(e.minutes)}</p>
            {e.projectId && <p className="flex items-center gap-1 text-sm text-muted"><MapPin size={14} aria-hidden />{projects.find((p) => p.id === e.projectId)?.name ?? "Objektas"}</p>}
          </div>
          {!locked && <div className="flex gap-2">
            <button onClick={() => setEditing(true)} aria-label="Redaguoti įrašą" className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-black/10"><Pencil size={18} aria-hidden /></button>
            <button disabled={pending} onClick={del} aria-label="Ištrinti įrašą" className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-black/10 text-danger"><Trash2 size={18} aria-hidden /></button>
          </div>}
        </div>
      )}
    </li>
  );
}

export default function TimeAdmin({ userId, entries, defaultDay, projects, approvedAt, ym }: { userId: string; entries: TimeRow[]; defaultDay: string; projects: Proj[]; approvedAt: string | null; ym: string }) {
  const locked = approvedAt !== null;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const total = entries.reduce((s, e) => s + e.minutes, 0);
  // Laikas pagal objektą (rodoma, jei bent vienas įrašas turi objektą).
  const byProject = new Map<string, number>();
  for (const e of entries) byProject.set(e.projectId ?? "", (byProject.get(e.projectId ?? "") ?? 0) + e.minutes);
  const showSplit = entries.some((e) => e.projectId);
  const splitRows = [...byProject.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between rounded-card bg-white p-5 shadow-card">
        <span>Iš viso per mėnesį</span>
        <strong>{formatDuration(total)}</strong>
      </div>
      {showSplit && (
        <section aria-label="Laikas pagal objektą" className="rounded-card bg-white p-5 shadow-card">
          <h3 className="mb-2 font-bold">Pagal objektą</h3>
          <ul className="space-y-1.5">
            {splitRows.map(([id, minutes]) => (
              <li key={id || "none"} className="flex items-baseline justify-between gap-3">
                <span className={id ? "" : "text-muted"}>{id ? projects.find((p) => p.id === id)?.name ?? "Objektas" : "Be objekto"}</span>
                <strong className="tabular-nums">{formatDuration(minutes)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Msg msg={msg} />
      {locked && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-2xl bg-go-soft p-3 text-sm font-medium text-go-dark">
          <Lock size={16} aria-hidden /> Šis mėnuo patvirtintas, įrašų keisti negalima.
          <Link href={`/valdymas/ataskaita?m=${ym}`} className="font-bold underline">Atšaukti patvirtinimą</Link>
        </p>
      )}
      {adding && !locked ? (
        <section className="rounded-card bg-white p-5 shadow-card">
          <EntryForm userId={userId} entry={null} projects={projects} defaultDay={defaultDay} onDone={(m) => { setAdding(false); setMsg(m); }} />
        </section>
      ) : locked ? null : (
        <button onClick={() => setAdding(true)} className={`${ghostBtn} flex w-full items-center justify-center gap-2`}><Plus size={18} aria-hidden /> Pridėti laiko įrašą</button>
      )}
      {entries.length === 0 && <p className="text-muted">Šį mėnesį įrašų nėra.</p>}
      <ul className="space-y-3">{entries.map((e) => <EntryRow key={e.id} e={e} userId={userId} projects={projects} locked={locked} onMsg={setMsg} />)}</ul>
    </div>
  );
}
