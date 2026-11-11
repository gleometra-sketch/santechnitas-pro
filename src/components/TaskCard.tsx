"use client";

import { useState, useTransition } from "react";
import { CheckCheck, MapPin, Navigation, Phone, User } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import { moveTask, setTaskStatus, toggleChecklistItem } from "@/lib/work/actions";
import type { ActionResult, TaskView } from "@/lib/work/types";

export default function TaskCard({ task, today }: { task: TaskView; today: string }) {
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
      <details>
        <summary className="cursor-pointer list-none rounded-card p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xl font-bold">{task.title}</h3>
            {isDone && <span className="shrink-0 rounded-full bg-go-soft px-2 py-0.5 text-sm font-semibold text-go-dark">Atlikta</span>}
          </div>
          {task.address && (
            <p className="mt-1 flex items-start gap-2 text-muted">
              <MapPin size={18} className="mt-1 shrink-0 text-danger" aria-hidden />
              {task.address}
            </p>
          )}
          <p className="mt-3 flex items-center gap-3 text-muted">
            {task.items.length > 0 && (
              <span className="flex items-center gap-1.5">
                <CheckCheck size={18} aria-hidden /> {done}/{task.items.length}
              </span>
            )}
            {task.orderNo && <span>{task.orderNo}</span>}
          </p>
        </summary>

        <div className="space-y-4 border-t border-black/10 p-5">
          {task.description && <p className="whitespace-pre-line">{task.description}</p>}

          {(task.clientName || task.clientPhone) && (
            <div className="rounded-2xl bg-surface p-3">
              <p className="flex items-center gap-2 text-sm text-muted"><User size={16} aria-hidden /> Klientas</p>
              {task.clientName && <p className="font-semibold">{task.clientName}</p>}
              {task.clientPhone && (
                <a href={`tel:${task.clientPhone.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex min-h-11 items-center gap-2 font-semibold text-accent-dark">
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
                      className="h-6 w-6 accent-[#5bb365]"
                    />
                    <span className={i.isDone ? "text-muted line-through" : ""}>{i.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {task.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 font-semibold"
            >
              <Navigation size={18} aria-hidden /> Atidaryti žemėlapyje
            </a>
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

          <div className="flex gap-3">
            <button
              disabled={pending}
              onClick={() => run(() => setTaskStatus(task.id, isDone ? "planned" : "done"))}
              className={`min-h-12 flex-1 rounded-2xl font-semibold disabled:opacity-60 ${isDone ? "border border-black/15" : "bg-go text-white"}`}
            >
              {isDone ? "Grąžinti į vykdomus" : "Pažymėti atlikta"}
            </button>
          </div>

          <div>
            <label htmlFor={`d-${task.id}`} className="block text-sm font-medium text-muted">Perkelti darbą į kitą dieną</label>
            <div className="mt-1 flex gap-2">
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

          {msg && <p role={msg.ok ? "status" : "alert"} className={`font-medium ${msg.ok ? "text-go-dark" : "text-danger"}`}>{msg.text}</p>}
        </div>
      </details>
    </article>
  );
}
