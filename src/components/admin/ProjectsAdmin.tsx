"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, FolderOpen, MapPin, Pencil, Plus, User } from "lucide-react";
import { createProject, setProjectArchived, updateProject } from "@/lib/admin/actions";
import type { ProjectRow } from "@/lib/admin/types";
import type { ActionResult } from "@/lib/work/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "./ui";

export type ProjectFormValues = { name: string; address: string; orderNo: string; notes: string; clientName: string; clientPhone: string; clientEmail: string };
type Form = ProjectFormValues;
const blank: Form = { name: "", address: "", orderNo: "", notes: "", clientName: "", clientPhone: "", clientEmail: "" };

export function ProjectForm({ initial, submitLabel, onSubmit, onCancel }: { initial: Form; submitLabel: string; onSubmit: (f: Form) => Promise<ActionResult>; onCancel?: () => void }) {
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const submit = () =>
    start(async () => {
      const r = await onSubmit(f);
      if (r.ok) {
        setMsg(null);
        if (!onCancel) setF(blank);
        else onCancel();
      } else setMsg({ ok: false, text: r.error });
    });
  return (
    <div className="space-y-3">
      <Field label="Pavadinimas"><input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={160} className={inputCls} /></Field>
      <Field label="Adresas"><input value={f.address} onChange={(e) => set({ address: e.target.value })} maxLength={300} className={inputCls} /></Field>
      <div className="rounded-xl bg-surface p-3">
        <p className="mb-2 text-sm font-bold">Klientas</p>
        <div className="space-y-3">
          <Field label="Vardas / įmonė"><input value={f.clientName} onChange={(e) => set({ clientName: e.target.value })} maxLength={160} className={inputCls} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Telefonas"><input type="tel" inputMode="tel" value={f.clientPhone} onChange={(e) => set({ clientPhone: e.target.value })} maxLength={40} className={inputCls} /></Field>
            <Field label="El. paštas"><input type="email" inputMode="email" value={f.clientEmail} onChange={(e) => set({ clientEmail: e.target.value })} maxLength={200} className={inputCls} /></Field>
          </div>
        </div>
      </div>
      <Field label="Užsakymo nr."><input value={f.orderNo} onChange={(e) => set({ orderNo: e.target.value })} maxLength={60} className={inputCls} /></Field>
      <Field label="Pastabos"><textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={4000} rows={3} className={`${inputCls} py-2`} /></Field>
      <Msg msg={msg} />
      <div className="flex gap-2">
        <button disabled={pending} onClick={submit} className={`${primaryBtn} flex-1`}>{pending ? "Saugoma..." : submitLabel}</button>
        {onCancel && <button disabled={pending} onClick={onCancel} className={ghostBtn}>Atšaukti</button>}
      </div>
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectRow }) {
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const r = await setProjectArchived(p.id, !p.archived);
      setMsg(r.ok ? null : { ok: false, text: r.error });
    });
  return (
    <li className={`rounded-card bg-white p-5 shadow-card ${p.archived ? "opacity-70" : ""}`}>
      {editing ? (
        <ProjectForm initial={{ name: p.name, address: p.address ?? "", orderNo: p.orderNo ?? "", notes: p.notes ?? "", clientName: p.clientName ?? "", clientPhone: p.clientPhone ?? "", clientEmail: p.clientEmail ?? "" }} submitLabel="Išsaugoti" onSubmit={(f) => updateProject(p.id, f)} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">{p.name}{p.orderNo && <span className="ml-2 text-sm font-medium text-muted">{p.orderNo}</span>}</h3>
              {p.address && <p className="mt-0.5 flex items-center gap-1 text-muted"><MapPin size={16} aria-hidden />{p.address}</p>}
              {p.clientName && <p className="mt-0.5 flex items-center gap-1 text-sm text-muted"><User size={15} aria-hidden />{p.clientName}</p>}
              {p.notes && <p className="mt-2 whitespace-pre-line text-sm">{p.notes}</p>}
            </div>
            {p.archived && <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-muted">Archyvuota</span>}
          </div>
          <Msg msg={msg} />
          <Link href={`/valdymas/objektai/${p.id}`} className={`${primaryBtn} mt-3 flex items-center justify-center gap-2`}><FolderOpen size={18} aria-hidden /> Atidaryti kortelę</Link>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setEditing(true)} className={`${ghostBtn} flex flex-1 items-center justify-center gap-2`}><Pencil size={18} aria-hidden /> Redaguoti</button>
            <button disabled={pending} onClick={toggle} className={`${ghostBtn} flex flex-1 items-center justify-center gap-2`}>
              {p.archived ? <><ArchiveRestore size={18} aria-hidden /> Atkurti</> : <><Archive size={18} aria-hidden /> Archyvuoti</>}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export default function ProjectsAdmin({ projects }: { projects: ProjectRow[] }) {
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  return (
    <div className="space-y-5">
      <section className="rounded-card bg-white p-5 shadow-card">
        <details>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-lg font-bold"><Plus size={22} aria-hidden /> Naujas objektas</summary>
          <div className="mt-3"><ProjectForm initial={blank} submitLabel="Sukurti objektą" onSubmit={(f) => createProject(f)} /></div>
        </details>
      </section>
      {active.length === 0 && <p className="text-muted">Aktyvių objektų nėra.</p>}
      <ul className="space-y-3">{active.map((p) => <ProjectCard key={p.id} p={p} />)}</ul>
      {archived.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer font-bold text-muted">Archyvas ({archived.length})</summary>
          <ul className="mt-3 space-y-3">{archived.map((p) => <ProjectCard key={p.id} p={p} />)}</ul>
        </details>
      )}
    </div>
  );
}
