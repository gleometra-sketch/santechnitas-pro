"use client";

import { useState, useTransition } from "react";
import { CalendarDays, MapPin, Pencil, Plus, Trash2, User, X } from "lucide-react";
import { addChecklistItem, createTask, deleteChecklistItem, deleteTask, updateTask } from "@/lib/admin/actions";
import type { AdminTask } from "@/lib/admin/types";
import { shortDay } from "@/lib/dates";
import type { ActionResult } from "@/lib/work/types";
import { Field, Msg, ghostBtn, inputCls, primaryBtn } from "./ui";

type Option = { id: string; label: string };
type Form = { title: string; description: string; projectId: string; assigneeId: string; date: string };
const blank: Form = { title: "", description: "", projectId: "", assigneeId: "", date: "" };
const STATUS: Record<AdminTask["status"], string> = { planned: "Suplanuota", in_progress: "Vykdoma", done: "Atlikta" };

function TaskFields({ f, set, projects, assignees }: { f: Form; set: (p: Partial<Form>) => void; projects: Option[]; assignees: Option[] }) {
  return (
    <>
      <Field label="Pavadinimas"><input value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} className={inputCls} /></Field>
      <Field label="Aprašymas"><textarea value={f.description} onChange={(e) => set({ description: e.target.value })} maxLength={4000} rows={3} className={`${inputCls} py-2`} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Objektas">
          <select value={f.projectId} onChange={(e) => set({ projectId: e.target.value })} className={inputCls}>
            <option value="">Nenurodytas</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Darbuotojas">
          <select value={f.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })} className={inputCls}>
            <option value="">Nepaskirtas</option>
            {assignees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Data"><input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} /></Field>
    </>
  );
}

const payload = (f: Form) => ({ title: f.title, description: f.description, projectId: f.projectId || null, assigneeId: f.assigneeId || null, date: f.date || null });

function NewTask({ projects, assignees }: { projects: Option[]; assignees: Option[] }) {
  const [f, setF] = useState(blank);
  const [list, setList] = useState<string[]>([""]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const r = await createTask(payload(f), list);
      if (r.ok) {
        setF(blank);
        setList([""]);
        setMsg({ ok: true, text: r.message ?? "Sukurta." });
      } else setMsg({ ok: false, text: r.error });
    });
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <details>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-lg font-bold"><Plus size={22} aria-hidden /> Naujas darbas</summary>
        <div className="mt-3 space-y-3">
          <TaskFields f={f} set={(p) => setF((x) => ({ ...x, ...p }))} projects={projects} assignees={assignees} />
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted">Užduočių sąrašas (nebūtina)</span>
            {list.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label={`Punktas ${i + 1}`} value={v} maxLength={200} onChange={(e) => setList((l) => l.map((x, j) => (j === i ? e.target.value : x)))} className="min-h-12 min-w-0 flex-1 rounded-xl border border-black/15 px-3" />
                <button aria-label="Pašalinti punktą" disabled={list.length === 1} onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-black/10 disabled:opacity-30"><X size={18} aria-hidden /></button>
              </div>
            ))}
            <button onClick={() => setList((l) => [...l, ""])} className="flex min-h-11 items-center gap-1 font-semibold text-accent-dark"><Plus size={18} aria-hidden /> Pridėti punktą</button>
          </div>
          <Msg msg={msg} />
          <button disabled={pending} onClick={submit} className={`${primaryBtn} w-full`}>{pending ? "Kuriama..." : "Sukurti darbą"}</button>
        </div>
      </details>
    </section>
  );
}

function TaskCard({ t, projects, assignees }: { t: AdminTask; projects: Option[]; assignees: Option[] }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<Form>({ title: t.title, description: t.description ?? "", projectId: t.projectId ?? "", assigneeId: t.assigneeId ?? "", date: t.date ?? "" });
  const [newItem, setNewItem] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg(null);
        after?.();
      } else setMsg({ ok: false, text: r.error });
    });
  const startEdit = () => {
    setF({ title: t.title, description: t.description ?? "", projectId: t.projectId ?? "", assigneeId: t.assigneeId ?? "", date: t.date ?? "" });
    setEditing(true);
  };
  const remove = () => {
    if (window.confirm(`Ištrinti darbą „${t.title}“? Veiksmo atšaukti negalima.`)) run(() => deleteTask(t.id));
  };

  return (
    <li className={`rounded-card bg-white p-5 shadow-card ${t.status === "done" ? "opacity-80" : ""}`}>
      {editing ? (
        <div className="space-y-3">
          <TaskFields f={f} set={(p) => setF((x) => ({ ...x, ...p }))} projects={projects} assignees={assignees} />
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted">Užduočių sąrašas</span>
            {t.items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2">
                <span className={i.isDone ? "text-muted line-through" : ""}>{i.title}</span>
                <button aria-label={`Pašalinti: ${i.title}`} disabled={pending} onClick={() => run(() => deleteChecklistItem(i.id))} className="flex h-9 w-9 items-center justify-center rounded-lg"><X size={16} aria-hidden /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input aria-label="Naujas punktas" value={newItem} maxLength={200} onChange={(e) => setNewItem(e.target.value)} placeholder="Naujas punktas" className="min-h-12 min-w-0 flex-1 rounded-xl border border-black/15 px-3" />
              <button disabled={pending || !newItem.trim()} onClick={() => run(() => addChecklistItem(t.id, newItem), () => setNewItem(""))} className={ghostBtn}>Pridėti</button>
            </div>
          </div>
          <Msg msg={msg} />
          <div className="flex gap-2">
            <button disabled={pending} onClick={() => run(() => updateTask(t.id, payload(f)), () => setEditing(false))} className={`${primaryBtn} flex-1`}>{pending ? "Saugoma..." : "Išsaugoti"}</button>
            <button disabled={pending} onClick={() => setEditing(false)} className={ghostBtn}>Uždaryti</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold leading-snug">{t.title}</h3>
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${t.status === "done" ? "bg-go-soft text-go-dark" : "bg-accent-soft text-accent-dark"}`}>{STATUS[t.status]}</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li className="flex items-center gap-1.5"><User size={16} aria-hidden />{t.assigneeName ?? "Nepaskirtas"}</li>
            <li className="flex items-center gap-1.5"><CalendarDays size={16} aria-hidden />{t.date ? shortDay(t.date) : "Be datos"}</li>
            {t.projectName && <li className="flex items-center gap-1.5"><MapPin size={16} aria-hidden />{t.projectName}</li>}
          </ul>
          {t.description && <p className="mt-2 whitespace-pre-line text-sm">{t.description}</p>}
          {t.items.length > 0 && (
            <p className="mt-2 text-sm text-muted">Punktai: {t.items.filter((i) => i.isDone).length}/{t.items.length}</p>
          )}
          <Msg msg={msg} />
          <div className="mt-3 flex gap-2">
            <button onClick={startEdit} className={`${ghostBtn} flex flex-1 items-center justify-center gap-2`}><Pencil size={18} aria-hidden /> Redaguoti</button>
            <button disabled={pending} onClick={remove} aria-label={`Ištrinti: ${t.title}`} className={`${ghostBtn} flex w-14 items-center justify-center px-0 text-danger`}><Trash2 size={18} aria-hidden /></button>
          </div>
        </>
      )}
    </li>
  );
}

export default function TasksAdmin({ tasks, projects, assignees }: { tasks: AdminTask[]; projects: Option[]; assignees: Option[] }) {
  return (
    <div className="space-y-4">
      <NewTask projects={projects} assignees={assignees} />
      {tasks.length === 0 && <p className="rounded-card bg-white p-5 text-muted shadow-card">Darbų nėra.</p>}
      <ul className="space-y-3">{tasks.map((t) => <TaskCard key={t.id} t={t} projects={projects} assignees={assignees} />)}</ul>
    </div>
  );
}
