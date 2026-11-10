import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WorkClock from "@/components/WorkClock";
import WageCalculator from "@/components/WageCalculator";
import { requireContext } from "@/lib/auth/context";
import { formatDuration, monthKey, monthTitle, shiftMonth, shortDay, todayKey } from "@/lib/dates";
import { getMonthHours, getMonthTotals, getWorkState } from "@/lib/work/queries";

export const dynamic = "force-dynamic";

export default async function ValandosPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const ctx = await requireContext();
  const currentYm = monthKey(todayKey());
  const { m } = await searchParams;
  const ym = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= currentYm ? m : currentYm;

  const [work, month, history] = await Promise.all([getWorkState(ctx), getMonthHours(ctx, ym), getMonthTotals(ctx, currentYm)]);
  const isCurrent = ym === currentYm;
  const nav = "flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white";

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Valandos</h1>
      <WorkClock compact status={work.status} workedMsAtRender={work.workedMsAtRender} todayMinutes={work.todayMinutes} mode={work.mode} projects={work.projects} projectId={work.projectId} defaultProjectId={work.defaultProjectId} startedAt={work.startedAt} stale={work.stale} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-card">
          <p className="text-sm text-muted">Šiandien</p>
          <p className="text-lg font-bold">{formatDuration(work.todayMinutes)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-card">
          <p className="text-sm text-muted">Ši savaitė</p>
          <p className="text-lg font-bold">{formatDuration(work.weekMinutes)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/valandos?m=${shiftMonth(ym, -1)}`} aria-label="Ankstesnis mėnuo" className={nav}><ChevronLeft aria-hidden /></Link>
        <h2 className="text-xl font-bold">{monthTitle(ym)}</h2>
        {isCurrent ? (
          <span aria-hidden className={`${nav} opacity-40`}><ChevronRight /></span>
        ) : (
          <Link href={`/valandos?m=${shiftMonth(ym, 1)}`} aria-label="Kitas mėnuo" className={nav}><ChevronRight aria-hidden /></Link>
        )}
      </div>

      <section className="rounded-card bg-white p-5 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <span>Iš viso per mėnesį</span>
          <strong>{formatDuration(month.totalMinutes)}</strong>
        </div>
        <WageCalculator minutes={month.totalMinutes} />
      </section>

      <section className="space-y-3">
        {month.days.length === 0 && <p className="text-muted">Šį mėnesį darbo laiko įrašų nėra.</p>}
        {month.days.map((d) => (
          <div key={d.date} className="flex items-center justify-between rounded-card bg-white p-5 shadow-card">
            <div>
              <p className="font-semibold">{shortDay(d.date)}</p>
              <p className="text-muted">{d.start}–{d.end ?? "vyksta"}</p>
            </div>
            <strong className="text-lg">{formatDuration(d.minutes)}</strong>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Mėnesių istorija</h2>
        <ul className="divide-y divide-black/5 rounded-card bg-white shadow-card">
          {history.map((h) => (
            <li key={h.ym}>
              <Link href={`/valandos?m=${h.ym}`} aria-current={h.ym === ym ? "page" : undefined} className="flex min-h-14 items-center justify-between px-5">
                <span className={h.ym === ym ? "font-bold" : ""}>{monthTitle(h.ym)}</span>
                <span className="text-muted">{formatDuration(h.minutes)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
