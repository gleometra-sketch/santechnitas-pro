"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS, WEEKDAYS_SHORT, addDays, longDayLabel, monthGrid, parseKey, weekStart } from "@/lib/dates";
import type { TaskView } from "@/lib/work/types";
import TaskCard from "./TaskCard";

export default function MonthCalendar({ today, tasks }: { today: string; tasks: TaskView[] }) {
  const [ty, tm] = parseKey(today);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [view, setView] = useState({ year: ty, month: tm });
  const [selected, setSelected] = useState(today);

  const byDay = new Map<string, TaskView[]>();
  for (const t of tasks) if (t.date) byDay.set(t.date, [...(byDay.get(t.date) ?? []), t]);
  const undated = tasks.filter((t) => !t.date && t.status !== "done");

  const shiftMonth = (delta: number) =>
    setView(({ year, month }) => {
      const m = month - 1 + delta;
      return { year: year + Math.floor(m / 12), month: (((m % 12) + 12) % 12) + 1 };
    });

  const goPrev = () => (mode === "month" ? shiftMonth(-1) : setSelected((s) => addDays(s, -7)));
  const goNext = () => (mode === "month" ? shiftMonth(1) : setSelected((s) => addDays(s, 7)));
  const goToday = () => {
    setView({ year: ty, month: tm });
    setSelected(today);
  };

  const cells = monthGrid(view.year, view.month);
  const wk = weekStart(selected);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(wk, i));
  const [wy, wm] = parseKey(wk);
  const title = mode === "month" ? `${MONTHS[view.month - 1]} ${view.year}` : `${MONTHS[wm - 1]} ${wy}`;

  const btn = "flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white";

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Kalendorius</h1>
          <p className="mt-1 font-semibold">{title}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={goPrev} aria-label={mode === "month" ? "Ankstesnis mėnuo" : "Ankstesnė savaitė"} className={`${btn} w-12`}><ChevronLeft aria-hidden /></button>
          <button onClick={goToday} className={`${btn} px-4 font-semibold`}>Šiandien</button>
          <button onClick={goNext} aria-label={mode === "month" ? "Kitas mėnuo" : "Kita savaitė"} className={`${btn} w-12`}><ChevronRight aria-hidden /></button>
        </div>
      </div>

      <div role="tablist" aria-label="Kalendoriaus vaizdas" className="grid grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1">
        {(["month", "week"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`min-h-11 rounded-xl font-semibold ${mode === m ? "bg-white shadow-card" : "text-muted"}`}>
            {m === "month" ? "Mėnuo" : "Savaitė"}
          </button>
        ))}
      </div>

      {mode === "month" ? (
        <>
          <div className="overflow-hidden rounded-card border border-black/10 bg-white">
            <div className="grid grid-cols-7 border-b border-black/10 py-2 text-center text-sm font-medium text-muted">
              {WEEKDAYS_SHORT.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((k) => {
                const [, m, d] = parseKey(k);
                const list = byDay.get(k) ?? [];
                const isSel = k === selected;
                return (
                  <button
                    key={k}
                    onClick={() => setSelected(k)}
                    aria-label={`${longDayLabel(k)}${list.length ? `, darbų: ${list.length}` : ""}`}
                    aria-pressed={isSel}
                    className={`relative min-h-[4.5rem] border-b border-r border-black/5 p-1.5 text-left ${isSel ? "bg-accent-soft" : ""}`}
                  >
                    <span className={`text-base ${k === today ? "font-bold text-accent" : m === view.month ? "text-ink/70" : "text-ink/30"}`}>{d}</span>
                    {list.length > 0 && (
                      <>
                        <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-white">{list.length}</span>
                        <span className="mt-1.5 block space-y-1">
                          {list.slice(0, 2).map((t) => <span key={t.id} className={`block h-1.5 rounded-full ${t.status === "done" ? "bg-go" : "bg-muted/70"}`} />)}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <section aria-live="polite">
            <h2 className="mb-3 text-lg font-bold">{longDayLabel(selected)}</h2>
            {(byDay.get(selected) ?? []).length === 0 ? (
              <p className="text-muted">Šią dieną darbų nėra.</p>
            ) : (
              <div className="space-y-3">{(byDay.get(selected) ?? []).map((t) => <TaskCard key={t.id} task={t} today={today} />)}</div>
            )}
          </section>
        </>
      ) : (
        <div className="space-y-5">
          {weekDays.map((k) => {
            const list = byDay.get(k) ?? [];
            return (
              <section key={k}>
                <h2 className={`mb-2 flex items-center gap-2 text-lg font-bold ${k === today ? "text-accent" : ""}`}>
                  {longDayLabel(k)}
                  {list.length > 0 && <span className="rounded-full bg-accent px-2 text-sm text-white">{list.length}</span>}
                </h2>
                {list.length === 0 ? <p className="text-muted">Laisva diena.</p> : <div className="space-y-3">{list.map((t) => <TaskCard key={t.id} task={t} today={today} />)}</div>}
              </section>
            );
          })}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">Be datos <span className="ml-1 text-sm text-muted">{undated.length}</span></h2>
        {undated.length === 0 ? <p className="text-muted">Visi darbai suplanuoti.</p> : <div className="space-y-3">{undated.map((t) => <TaskCard key={t.id} task={t} today={today} />)}</div>}
      </section>
    </div>
  );
}
