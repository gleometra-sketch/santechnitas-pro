"use client";

import { useState, useTransition } from "react";
import { Check, CheckCheck, ChevronDown, MapPin, Navigation, Phone, RotateCcw, User } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import { moveTask, setTaskStatus, toggleChecklistItem } from "@/lib/work/actions";
import type { ActionResult, TaskView } from "@/lib/work/types";

const phoneHref = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
const mapHref = (a: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
const iconBtn = "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-accent-dark";

export default function TaskCard({ task, today }: { task: TaskView; today: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [date, setDate] = useState(task.date ?? today);

  const done = task.items.filter((i) => i.isDone).length;
  const isDone = task.status === "done";

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error });
    });

  return (
    <article className={`rounded-card bg-white shadow-card ${isDone ? "opacity-75" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`task-${task.id}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 rounded-card p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-lg font-bold leading-snug">{task.title}</span>
            {isDone && <span className="shrink-0 rounded-full bg-go-soft px-2 py-0.5 text-sm font-semibold text-go-dark">Atlikta</span>}
          </span>
          {task.address && (
            <span className="mt-1 flex items-start gap-1.5 text-sm text-muted">
              <MapPin size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
              {task.address}
            </span>
          )}
          {(task.items.length > 0 || task.orderNo) && (
            <span className="mt-2 flex items-center gap-3 text-sm text-muted">
              {task.items.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <CheckCheck size={16} aria-hidden /> {done}/{task.items.length}
                </span>
              )}
              {task.orderNo && <span>{task.orderNo}</span>}
            </span>
          )}
        </span>
        <ChevronDown size={22} aria-hidden className={`mt-1 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Greiti veiksmai matomi ir sulankstytoje kortelėje */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          disabled={pending}
          onClick={() => run(() => setTaskStatus(task.id, isDone ? "planned" : "done"))}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-semibold disabled:opacity-60 ${isDone ? "border border-black/15" : "bg-go text-white"}`}
        >
          {isDone ? <><RotateCcw size={18} aria-hidden /> Grąžinti</> : <><Check size={20} aria-hidden /> Atlikta</>}
        </button>
        {task.address && (
          <a href={mapHref(task.address)} target="_blank" rel="noopener noreferrer" aria-label="Atidaryti žemėlapyje" className={iconBtn}>
            <Navigation size={20} aria-hidden />
          </a>
        )}
        {task.clientPhone && (
          <a href={phoneHref(task.clientPhone)} aria-label={`Skambinti klientui: ${task.clientPhone}`} className={iconBtn}>
            <Phone size={20} aria-hidden />
          </a>
        )}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`-mt-1 px-4 pb-4 font-medium ${msg.ok ? "text-go-dark" : "text-danger"}`}>{msg.text}</p>}

      {open && (
        <div id={`task-${task.id}`} className="space-y-4 border-t border-black/10 p-4">
          {task.description && <p className="whitespace-pre-line">{task.description}</p>}

          {(task.clientName || task.clientPhone) && (
            <div className="rounded-2xl bg-surface p-3">
              <p className="flex items-center gap-2 text-sm text-muted"><User size={16} aria-hidden /> Klientas</p>
              {task.clientName && <p className="font-semibold">{task.clientName}</p>}
              {task.clientPhone && (
                <a href={phoneHref(task.clientPhone)} className="mt-1 inline-flex min-h-11 items-center gap-2 font-semibold text-accent-dark">
                  <Phone size={18} aria-hidden /> {task.clientPhone}
                </a>
              )}
            </div>
          )}

          {task.items.length > 0 && (
            <ul className="space-y-1">
              {task.items.map((i) => (
                <li key={i.id}>
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={i.isDone}
                      disabled={pending}
                      onChange={(e) => run(() => toggleChecklistItem(i.id, e.target.checked))}
                      className="h-6 w-6 shrink-0 accent-[#5bb365]"
                    />
                    <span className={i.isDone ? "text-muted line-through" : ""}>{i.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Nuotraukos</p>
            {task.photos.length > 0 && (
              <ul className="mb-2 grid grid-cols-3 gap-2">
                {task.photos.map((p) => (
                  <li key={p.id}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Atidaryti nuotrauką: ${p.name}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.name} loading="lazy" className="h-24 w-full rounded-lg object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <FileUploader companyId={task.companyId} projectId={task.projectId} taskId={task.id} accept="image/*" label="Pridėti nuotrauką" photo />
          </div>

          <details className="rounded-2xl border border-black/10">
            <summary className="flex min-h-12 cursor-pointer items-center px-3 font-semibold text-muted">Perkelti į kitą dieną</summary>
            <div className="border-t border-black/10 p-3">
              <label htmlFor={`d-${task.id}`} className="sr-only">Nauja data</label>
              <div className="flex gap-2">
                <input
                  id={`d-${task.id}`}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-12 min-w-0 flex-1 rounded-2xl border border-black/15 px-3"
                />
                <button
                  disabled={pending || !date}
                  onClick={() => run(() => moveTask(task.id, date))}
                  className="min-h-12 rounded-2xl bg-accent px-4 font-semibold text-white disabled:opacity-60"
                >
                  Perkelti
                </button>
              </div>
              {task.date && (
                <button disabled={pending} onClick={() => run(() => moveTask(task.id, null))} className="mt-2 min-h-11 text-sm font-semibold text-accent-dark underline">
                  Pašalinti datą
                </button>
              )}
            </div>
          </details>
        </div>
      )}
    </article>
  );
}
