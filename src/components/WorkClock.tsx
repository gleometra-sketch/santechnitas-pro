"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Coffee, MapPin, Play, Square } from "lucide-react";
import { addNote, finishWork, markDayOff, pauseWork, resumeWork, startWork, switchWorkProject, undoDayOff } from "@/lib/work/actions";
import { STALE_ENTRY_HOURS, type ActionResult, type TimeMode, type TimeProject, type WorkStatus } from "@/lib/work/types";
import { formatDuration } from "@/lib/dates";

const pad = (n: number) => String(n).padStart(2, "0");
function clockParts(ms: number) {
  const s = Math.floor(ms / 1000);
  return { hm: `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`, sec: pad(s % 60) };
}

type Props = {
  status: WorkStatus;
  workedMsAtRender: number;
  todayMinutes: number;
  /** „project“ – prieš pradedant reikia pasirinkti objektą. */
  mode?: TimeMode;
  projects?: TimeProject[];
  projectId?: string | null;
  defaultProjectId?: string | null;
  /** Neuždaryto darbo pradžia ir ar jis jau per ilgas (greičiausiai pamirštas „Baigti“). */
  startedAt?: string | null;
  stale?: boolean;
  compact?: boolean;
};

const fmtStart = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

const optionLabel = (p: TimeProject) => (p.address ? `${p.name} – ${p.address}` : p.name);

export default function WorkClock(props: Props) {
  const { status, workedMsAtRender, todayMinutes, compact = false, mode = "hours", projects = [], projectId = null, defaultProjectId = null, startedAt = null, stale = false } = props;
  const byProject = mode === "project";
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [base, setBase] = useState({ ms: workedMsAtRender, at: 0 });
  const [now, setNow] = useState(0);
  const [chosen, setChosen] = useState(defaultProjectId ?? (projects.length === 1 ? projects[0].id : ""));
  const [switching, setSwitching] = useState(false);
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");

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

  useEffect(() => {
    if (!chosen && defaultProjectId) setChosen(defaultProjectId);
  }, [defaultProjectId, chosen]);

  useEffect(() => {
    if (status !== "working") setSwitching(false);
  }, [status]);

  const live = status === "working" ? base.ms + Math.max(0, now - base.at) : base.ms;
  const totalToday = todayMinutes + Math.floor(Math.max(0, live - workedMsAtRender) / 60000);

  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? "" : r.error);
      if (r.ok) after?.();
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
  const select = "min-h-12 w-full rounded-xl border border-black/15 bg-white px-3 text-ink";

  const label =
    status === "off" ? "Nedarbo diena" : status === "idle" ? "Darbas nepradėtas" : status === "working" ? "Darbas vyksta" : status === "break" ? "Pertrauka" : "Darbas baigtas";
  const dot = status === "working" ? "bg-go" : status === "break" ? "bg-accent" : status === "done" ? "bg-go" : "bg-muted/40";
  const currentProject = projects.find((p) => p.id === projectId);
  const canStart = !byProject || !!chosen;

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

      {active && stale && (
        <div role="alert" className="mt-3 rounded-xl bg-white p-3 text-ink">
          <p className="flex items-center gap-2 font-bold text-brand-red"><AlertTriangle size={18} aria-hidden /> Darbas atviras per ilgai</p>
          <p className="mt-1 text-sm">
            Pradėtas {startedAt ? fmtStart(startedAt) : ""}. Greičiausiai pamiršote paspausti „Baigti“. Suvestinėje laikas skaičiuojamas ne ilgiau kaip {STALE_ENTRY_HOURS} val., o tikrą pabaigą pataisys biuras.
          </p>
          {notice && <p className="mt-2 text-sm font-semibold text-go-dark">{notice}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              disabled={pending || !!notice}
              onClick={() => run(() => addNote(`Pamiršau užbaigti darbą (pradėtas ${startedAt ? fmtStart(startedAt) : ""}). Prašau pataisyti pabaigos laiką.`), () => setNotice("Biurui pranešta."))}
              className={`${btn} border border-black/10 bg-white`}
            >
              Pranešti biurui
            </button>
            <button disabled={pending} onClick={() => run(finishWork)} className={`${btn} bg-brand-red text-white`}>
              <Square size={16} fill="currentColor" aria-hidden /> Baigti dabar
            </button>
          </div>
        </div>
      )}

      {active && !stale && (
        <>
          <p className={`mt-2 font-display font-bold tabular-nums leading-none tracking-tight ${compact ? "text-4xl" : "text-5xl"} ${status === "break" ? "text-ink/60" : ""}`}>
            {t.hm}
            <span className={`ml-1 text-xl font-medium ${dark ? "text-white/50" : "text-muted"}`}>:{t.sec}</span>
          </p>

          {byProject && !switching && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className={`flex min-w-0 items-center gap-1.5 text-sm ${dark ? "text-white/80" : "text-muted"}`}>
                <MapPin size={15} aria-hidden className="shrink-0" />
                <span className="truncate">{currentProject ? currentProject.name : projectId ? "Objektas" : "Objektas nepasirinktas"}</span>
              </p>
              {status === "working" && projects.length > 0 && (
                <button
                  disabled={pending}
                  onClick={() => { setTarget(""); setSwitching(true); }}
                  className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold ${dark ? "bg-white/10 text-white" : "border border-black/10 bg-white"}`}
                >
                  <ArrowRightLeft size={14} aria-hidden /> {projectId ? "Keisti objektą" : "Pasirinkti objektą"}
                </button>
              )}
            </div>
          )}

          {byProject && switching && (
            <div className="mt-3 space-y-2">
              <select aria-label="Naujas objektas" value={target} onChange={(e) => setTarget(e.target.value)} className={select}>
                <option value="">Pasirinkite objektą</option>
                {projects.filter((p) => p.id !== projectId).map((p) => <option key={p.id} value={p.id}>{optionLabel(p)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2.5">
                <button disabled={pending || !target} onClick={() => run(() => switchWorkProject(target), () => setSwitching(false))} className={`${btn} bg-accent text-white`}>
                  <ArrowRightLeft size={16} aria-hidden /> Perjungti
                </button>
                <button disabled={pending} onClick={() => setSwitching(false)} className={`${btn} ${ghost}`}>Atšaukti</button>
              </div>
              <p className="text-xs text-white/60">Iki šiol dirbtas laikas lieka ankstesniame objekte.</p>
            </div>
          )}

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
        <div className="mt-3 space-y-2.5">
          {byProject && (
            <div>
              <select aria-label="Objektas" value={chosen} onChange={(e) => setChosen(e.target.value)} className={select}>
                <option value="">Pasirinkite objektą</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{optionLabel(p)}</option>)}
              </select>
              {projects.length === 0 && <p className="mt-1.5 text-sm text-muted">Aktyvių objektų nėra. Paprašykite biuro sukurti objektą.</p>}
            </div>
          )}
          <div className={`grid gap-2.5 ${status === "idle" && !compact ? "grid-cols-[1fr_auto]" : "grid-cols-1"}`}>
            <button
              disabled={pending || !canStart}
              onClick={() => run(() => startWork(byProject ? chosen : null))}
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
        </div>
      )}

      {error && <p role="alert" className={`mt-3 font-medium ${dark ? "text-brand-red-light" : "text-danger"}`}>{error}</p>}
    </section>
  );
}
