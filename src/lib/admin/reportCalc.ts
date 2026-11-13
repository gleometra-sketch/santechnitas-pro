import type { MonthReport, ReportProjectLine, ReportRow } from "./types";

/** Gryni (be duomenų bazės) mėnesio ataskaitos skaičiavimai – lengva testuoti. */

export type RateRow = { userId: string; from: string; cents: number };
export type EntryRow = { userId: string; projectId: string | null; workDate: string; minutes: number; ended: boolean };
export type Snapshot = { name?: string; minutes?: number; amountCents?: number; missingRateMinutes?: number; rateCents?: number | null; byProject?: ReportProjectLine[] };
export type ApprovalRow = { userId: string; minutes: number; approvedAt: string; snapshot: Snapshot | null };

const LT = "lt";

/** Darbuotojo valandinis įkainys (centais) nurodytai dienai: paskutinis, kurio `from` ≤ data. Null – įkainio dar nebuvo. */
export function rateAt(rates: RateRow[], userId: string, date: string): number | null {
  let best: RateRow | null = null;
  for (const r of rates) {
    if (r.userId !== userId || r.from > date) continue;
    if (best === null || r.from > best.from) best = r;
  }
  return best ? best.cents : null;
}

export function buildRows(
  entries: EntryRow[],
  rates: RateRow[],
  names: Map<string, string>,
  projectNames: Map<string, string>,
  monthEnd: string,
): ReportRow[] {
  type Acc = { minutes: number; amount: number; missing: number; open: number; proj: Map<string, { minutes: number; amount: number }> };
  const perUser = new Map<string, Acc>();

  for (const e of entries) {
    const rate = rateAt(rates, e.userId, e.workDate);
    const amount = rate === null ? 0 : (e.minutes * rate) / 60;
    const acc = perUser.get(e.userId) ?? { minutes: 0, amount: 0, missing: 0, open: 0, proj: new Map() };
    acc.minutes += e.minutes;
    acc.amount += amount;
    if (rate === null) acc.missing += e.minutes;
    if (!e.ended) acc.open += 1;
    const key = e.projectId ?? "";
    const p = acc.proj.get(key) ?? { minutes: 0, amount: 0 };
    p.minutes += e.minutes;
    p.amount += amount;
    acc.proj.set(key, p);
    perUser.set(e.userId, acc);
  }

  const line = (key: string, v: { minutes: number; amount: number }): ReportProjectLine => ({
    projectId: key || null,
    name: key ? projectNames.get(key) ?? "Objektas" : "Be objekto",
    minutes: v.minutes,
    amountCents: Math.round(v.amount),
  });

  return [...perUser.entries()]
    .map(([userId, a]) => ({
      userId,
      name: names.get(userId) ?? "Buvęs darbuotojas",
      minutes: a.minutes,
      amountCents: Math.round(a.amount),
      missingRateMinutes: a.missing,
      rateCents: rateAt(rates, userId, monthEnd),
      openCount: a.open,
      byProject: [...a.proj.entries()].map(([k, v]) => line(k, v)).sort((x, y) => y.minutes - x.minutes),
      approvedAt: null,
    }))
    .sort((x, y) => x.name.localeCompare(y.name, LT));
}

/** Patvirtintiems darbuotojams rodo užšaldytus (snapshot) skaičius; patvirtintus be gyvų įrašų prideda iš snapshot. */
export function overlayApprovals(rows: ReportRow[], approvals: ApprovalRow[], names: Map<string, string>): ReportRow[] {
  if (approvals.length === 0) return rows;
  const byUser = new Map(approvals.map((a) => [a.userId, a] as const));
  const out: ReportRow[] = rows.map((r) => {
    const a = byUser.get(r.userId);
    if (!a) return r;
    const snap = a.snapshot ?? {};
    return {
      ...r,
      minutes: a.minutes,
      amountCents: snap.amountCents ?? r.amountCents,
      missingRateMinutes: snap.missingRateMinutes ?? 0,
      rateCents: snap.rateCents === undefined ? r.rateCents : snap.rateCents,
      byProject: snap.byProject ?? r.byProject,
      openCount: 0,
      approvedAt: a.approvedAt,
    };
  });
  for (const a of approvals) {
    if (out.some((r) => r.userId === a.userId)) continue;
    const snap = a.snapshot ?? {};
    out.push({
      userId: a.userId,
      name: snap.name ?? names.get(a.userId) ?? "Buvęs darbuotojas",
      minutes: a.minutes,
      amountCents: snap.amountCents ?? 0,
      missingRateMinutes: snap.missingRateMinutes ?? 0,
      rateCents: snap.rateCents ?? null,
      openCount: 0,
      byProject: snap.byProject ?? [],
      approvedAt: a.approvedAt,
    });
  }
  return out.sort((x, y) => x.name.localeCompare(y.name, LT));
}

/** Eilutes paverčia mėnesio ataskaita su bendromis sumomis ir suvestine pagal objektą. */
export function summarize(ym: string, rows: ReportRow[]): MonthReport {
  const perProject = new Map<string, ReportProjectLine>();
  for (const r of rows) {
    for (const p of r.byProject) {
      const key = p.projectId ?? "";
      const g = perProject.get(key) ?? { projectId: p.projectId, name: p.name, minutes: 0, amountCents: 0 };
      g.minutes += p.minutes;
      g.amountCents += p.amountCents;
      perProject.set(key, g);
    }
  }
  return {
    ym,
    rows,
    byProject: [...perProject.values()].sort((x, y) => y.minutes - x.minutes),
    totalMinutes: rows.reduce((s, r) => s + r.minutes, 0),
    totalAmountCents: rows.reduce((s, r) => s + r.amountCents, 0),
    missingRateMinutes: rows.reduce((s, r) => s + r.missingRateMinutes, 0),
    openCount: rows.reduce((s, r) => s + r.openCount, 0),
    approvedCount: rows.filter((r) => r.approvedAt).length,
  };
}
