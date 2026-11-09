"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Coffee, Play, Square } from "lucide-react";
import { finishWork, markDayOff, pauseWork, resumeWork, startWork, undoDayOff } from "@/lib/work/actions";
import type { ActionResult, WorkStatus } from "@/lib/work/types";
import { formatDuration } from "@/lib/dates";

const pad = (n: number) => String(n).padStart(2, "0");
function clockParts(ms: number) {
  const s = Math.floor(ms / 1000);
  return { hm: `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`, sec: pad(s % 60) };
}

export default function WorkClock(props: { status: WorkStatus; workedMsAtRender: number; todayMinutes: number; compact?: boolean }) {
  const { status, workedMsAtRender, todayMinutes, compact = false } = props;
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [base, setBase] = useState({ ms: workedMsAtRender, at: 0 });
  const [now, setNow] = useState(0);

  useEffect(() => {
    const t = Date.now();
    setBase({ ms: workedMsAtRender, at: t });
    setNow(t);
  }, [workedMsAtRender, status]);

  useEffect(() => {
    if (status !== "working") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const live = status === "working" ? base.ms + Math.max(0, now - base.at) : base.ms;
  const totalToday = todayMinutes + Math.floor(Math.max(0, live - workedMsAtRender) / 60000);

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? "" : r.error);
    });

  const t = clockParts(live);
  const active = status === "working" || status === "break";
  const dark = status === "working";
  const tone = dark
    ? "bg-gradient-to-br from-navy to-navy-700 text-white"
    : status === "break"
      ? "border border-accent/30 bg-accent-soft"
      : "border border-black/5 bg-white";
  const ghost = dark ? "border border-white/25 bg-white/10 text-white" : "border border-black/10 bg-white";
  const btn = "flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition active:scale-[.98] disabled:opacity-60";

  const label =
    status === "off" ? "Nedarbo diena" : status === "idle" ? "Darbas nepradėtas" : status === "working" ? "Darbas vyksta" : status === "break" ? "Pertrauka" : "Darbas baigtas";
  const dot =
    status === "working" ? "bg-go" : status === "break" ? "bg-accent" : status === "done" ? "bg-go" : "bg-muted/40";

  return (
    <section className={`rounded-card ${compact ? "p-3.5" : "p-4"} shadow-card ${tone}`} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className={`flex items-center gap-2 text-sm font-semibold ${dark ? "text-white/80" : "text-muted"}`}>
          <span className="relative flex h-2.5 w-2.5">
            {status === "working" && <span aria-hidden className="absolute inline-flex h-full w-full animate-ping rounded-full bg-go opacity-60" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
          </span>
          {label}
        </p>
        {status !== "idle" && status !== "off" && (
          <p className={`text-sm ${dark ? "text-white/70" : "text-muted"}`}>Šiandien: <strong className={dark ? "text-white" : "text-ink"}>{formatDuration(totalToday)}</strong></p>
        )}
      </div>

      {status === "off" && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-semibold">Šiandien pažymėta kaip nedarbo diena</p>
          <button disabled={pending} onClick={() => run(undoDayOff)} className={`${btn} ${ghost} shrink-0`}>Atšaukti</button>
        </div>
      )}

      {active && (
        <>
          <p className={`mt-2 font-display font-bold tabular-nums leading-none tracking-tight ${compact ? "text-4xl" : "text-5xl"} ${status === "break" ? "text-ink/60" : ""}`}>
            {t.hm}
            <span className={`ml-1 text-xl font-medium ${dark ? "text-white/50" : "text-muted"}`}>:{t.sec}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {status === "working" ? (
              <button disabled={pending} onClick={() => run(pauseWork)} className={`${btn} ${ghost}`}>
                <Coffee size={18} aria-hidden /> Pertrauka
              </button>
            ) : (
              <button disabled={pending} onClick={() => run(resumeWork)} className={`${btn} bg-go-dark text-white`}>
                <Play size={16} fill="currentColor" aria-hidden /> Tęsti
              </button>
            )}
            <button disabled={pending} onClick={() => run(finishWork)} className={`${btn} bg-brand-red text-white`}>
              <Square size={16} fill="currentColor" aria-hidden /> Baigti
            </button>
          </div>
        </>
      )}

      {(status === "idle" || status === "done") && (
        <div className={`mt-3 grid gap-2.5 ${status === "idle" && !compact ? "grid-cols-[1fr_auto]" : "grid-cols-1"}`}>
          <button
            disabled={pending}
            onClick={() => run(startWork)}
            className={`${btn} min-h-14 text-lg ${status === "done" ? "border-2 border-go-dark text-go-dark" : "bg-gradient-to-br from-[#74d684] to-go-dark text-white shadow-[0_6px_16px_rgba(63,154,74,.3)]"}`}
          >
            {status === "done" ? <CheckCircle2 size={20} aria-hidden /> : <Play size={20} fill="currentColor" aria-hidden />}
            {status === "done" ? "Pradėti vėl" : "Pradėti darbą"}
          </button>
          {status === "idle" && !compact && (
            <button disabled={pending} onClick={() => run(markDayOff)} className={`${btn} min-h-14 border border-black/10 bg-white text-sm`}>
              Šiandien nedirbu
            </button>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-3 font-medium text-danger">{error}</p>}
    </section>
  );
}
