import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { ApprovalControl, ApproveAllButton } from "@/components/admin/ApprovalButtons";
import { requireContext } from "@/lib/auth/context";
import { getMonthReport } from "@/lib/admin/queries";
import { formatDuration, monthKey, monthTitle, shiftMonth, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AtaskaitaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContext();
  const currentYm = monthKey(todayKey());
  const m = first((await searchParams).m);
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= currentYm ? m : currentYm;
  const report = await getMonthReport(ctx, ym);

  const nav = "flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white";
  const showProjects = report.byProject.some((p) => p.projectId);
  const isPast = ym < currentYm;
  const pendingApproval = report.rows.filter((r) => !r.approvedAt && r.minutes > 0 && r.openCount === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/valdymas/ataskaita?m=${shiftMonth(ym, -1)}`} aria-label="Ankstesnis mėnuo" className={nav}><ChevronLeft aria-hidden /></Link>
        <h2 className="text-xl font-bold">{monthTitle(ym)}</h2>
        {ym === currentYm ? <span aria-hidden className={`${nav} opacity-40`}><ChevronRight /></span> : <Link href={`/valdymas/ataskaita?m=${shiftMonth(ym, 1)}`} aria-label="Kitas mėnuo" className={nav}><ChevronRight aria-hidden /></Link>}
      </div>

      <section aria-label="Suvestinė" className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-3xl font-extrabold">{formatDuration(report.totalMinutes)}</p>
          <p className="mt-1 text-sm text-muted">Valandos iš viso</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-3xl font-extrabold text-accent-dark">{formatMoney(report.totalAmountCents)}</p>
          <p className="mt-1 text-sm text-muted">Pagal įkainius, be mokesčių</p>
        </div>
      </section>

      {report.missingRateMinutes > 0 && (
        <p role="status" className="rounded-2xl bg-accent-soft p-3 text-sm font-medium">
          {formatDuration(report.missingRateMinutes)} laiko įkainis nenustatytas, todėl į sumą neįtrauktas. <Link href="/valdymas/darbuotojai" className="font-bold underline">Nustatyti įkainius</Link>
        </p>
      )}
      {report.openCount > 0 && (
        <p role="status" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-danger">
          Yra neuždarytų darbo laiko įrašų ({report.openCount}): jų laikas skaičiuojamas ne ilgiau kaip 16 val. <Link href="/valdymas/laikas" className="font-bold underline">Pataisyti</Link>
        </p>
      )}

      {!isPast && <p className="rounded-2xl bg-surface p-3 text-sm text-muted">Valandas galima patvirtinti pasibaigus mėnesiui. Patvirtintų valandų keisti nebegalima, kol patvirtinimas neatšauktas.</p>}
      {isPast && report.approvedCount > 0 && <p className="text-sm text-muted">Patvirtinta: {report.approvedCount} iš {report.rows.length}. Patvirtintiems rodomi užšaldyti skaičiai.</p>}
      {isPast && pendingApproval > 0 && <ApproveAllButton ym={ym} />}

      <a href={`/valdymas/ataskaita/eksportas?m=${ym}`} download className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-black/15 bg-white font-semibold">
        <Download size={18} aria-hidden /> Eksportuoti CSV (Excel)
      </a>

      {report.rows.length === 0 && <p className="rounded-card bg-white p-5 text-muted shadow-card">Šį mėnesį darbo laiko įrašų nėra.</p>}

      <ul className="space-y-3">
        {report.rows.map((r) => (
          <li key={r.userId} className="rounded-card bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold">{r.name}</h3>
                <p className="text-sm text-muted">{r.rateCents === null ? "Įkainis nenustatytas" : `${formatMoney(r.rateCents)} / val.`}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold tabular-nums">{formatDuration(r.minutes)}</p>
                <p className="font-semibold tabular-nums text-accent-dark">{r.missingRateMinutes === r.minutes && r.minutes > 0 ? "–" : formatMoney(r.amountCents)}</p>
              </div>
            </div>
            <ApprovalControl
              userId={r.userId}
              ym={ym}
              name={r.name}
              approvedAt={r.approvedAt}
              canApprove={isPast && r.minutes > 0 && r.openCount === 0}
              hint={!isPast ? "Galima pasibaigus mėnesiui." : r.openCount > 0 ? "Yra neuždarytų įrašų, pirmiausia juos užbaikite." : r.minutes === 0 ? "Šį mėnesį įrašų nėra." : undefined}
            />
            {r.byProject.some((p) => p.projectId) && (
              <details className="mt-3">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold text-muted">Pagal objektą ({r.byProject.length})</summary>
                <ul className="space-y-1.5 pb-1 pt-1">
                  {r.byProject.map((p) => (
                    <li key={p.projectId ?? "none"} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={p.projectId ? "" : "text-muted"}>{p.name}</span>
                      <span className="tabular-nums">{formatDuration(p.minutes)} · {formatMoney(p.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>

      {showProjects && (
        <section aria-label="Pagal objektą" className="rounded-card bg-white p-5 shadow-card">
          <h3 className="mb-2 text-lg font-bold">Visi darbuotojai pagal objektą</h3>
          <ul className="space-y-1.5">
            {report.byProject.map((p) => (
              <li key={p.projectId ?? "none"} className="flex items-baseline justify-between gap-3">
                <span className={p.projectId ? "" : "text-muted"}>{p.name}</span>
                <span className="font-semibold tabular-nums">{formatDuration(p.minutes)} · {formatMoney(p.amountCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
