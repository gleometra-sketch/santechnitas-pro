import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import { monthKey, monthRange, todayKey } from "@/lib/dates";
import { STALE_ENTRY_MS } from "@/lib/work/types";
import { signPaths } from "@/lib/files/server";
import type { AdminTask, MemberRow, MonthReport, ProjectFile, ProjectHours, ProjectMaterial, ProjectRow, ReportProjectLine, ReportRow, StaleEntry, TimeRow } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = (v: any) => (Array.isArray(v) ? v[0] : v);

export async function getProjects(ctx: SessionContext): Promise<ProjectRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, address, order_no, notes, status, client_name, client_phone, client_email")
    .eq("company_id", ctx.company!.id)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((p: any) => ({ id: p.id, name: p.name, address: p.address, orderNo: p.order_no, notes: p.notes, archived: p.status === "archived", clientName: p.client_name ?? null, clientPhone: p.client_phone ?? null, clientEmail: p.client_email ?? null }));
}

export const getMembers = cache(async (ctx: SessionContext): Promise<MemberRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("id, user_id, email, role, status, time_mode")
    .eq("company_id", ctx.company!.id)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as any[];
  const ids = rows.map((r) => r.user_id).filter(Boolean) as string[];
  const names = new Map<string, string>();
  const rates = new Map<string, { cents: number; from: string }>();
  if (ids.length) {
    const [{ data: profiles }, { data: rateRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", ids),
      supabase.from("member_rates").select("user_id, hourly_rate_cents, effective_from").eq("company_id", ctx.company!.id).lte("effective_from", todayKey()).order("effective_from", { ascending: false }),
    ]);
    for (const p of profiles ?? []) if (p.full_name?.trim()) names.set(p.id, p.full_name.trim());
    for (const r of (rateRows ?? []) as any[]) if (!rates.has(r.user_id)) rates.set(r.user_id, { cents: r.hourly_rate_cents, from: r.effective_from });
  }
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    email: r.email,
    name: r.user_id ? names.get(r.user_id) ?? null : null,
    role: r.role,
    status: r.status,
    timeMode: r.time_mode === "project" || r.time_mode === "hours" ? r.time_mode : null,
    rateCents: r.user_id ? rates.get(r.user_id)?.cents ?? null : null,
    rateFrom: r.user_id ? rates.get(r.user_id)?.from ?? null : null,
  }));
});

export const memberLabel = (m: Pick<MemberRow, "name" | "email">) => m.name ?? m.email;

export async function getAdminTasks(ctx: SessionContext, f: { assigneeId: string | null; status: "open" | "done" | "all"; projectId?: string | null }): Promise<AdminTask[]> {
  const supabase = await createClient();
  let q = supabase
    .from("tasks")
    .select("id, title, description, scheduled_date, status, project_id, assigned_to, project:projects(id, name), task_checklist_items(id, title, is_done, position)")
    .eq("company_id", ctx.company!.id);
  if (f.assigneeId) q = q.eq("assigned_to", f.assigneeId);
  if (f.projectId) q = q.eq("project_id", f.projectId);
  if (f.status === "open") q = q.neq("status", "done");
  if (f.status === "done") q = q.eq("status", "done");
  const [{ data }, members] = await Promise.all([
    q.order("scheduled_date", { ascending: f.status !== "done", nullsFirst: false }).limit(300),
    getMembers(ctx),
  ]);
  const byUser = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, memberLabel(m)]));
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.scheduled_date,
    status: r.status,
    projectId: r.project_id,
    projectName: one(r.project)?.name ?? null,
    assigneeId: r.assigned_to,
    assigneeName: r.assigned_to ? byUser.get(r.assigned_to) ?? "Buvęs darbuotojas" : null,
    items: [...(r.task_checklist_items ?? [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((i: any) => ({ id: i.id, title: i.title, isDone: i.is_done })),
  }));
}

export async function getTimeEntries(ctx: SessionContext, userId: string, ym: string): Promise<TimeRow[]> {
  const supabase = await createClient();
  const { from, to } = monthRange(ym);
  const { data } = await supabase
    .from("time_entry_summary")
    .select("id, started_at, ended_at, worked_minutes, project_id")
    .eq("company_id", ctx.company!.id)
    .eq("user_id", userId)
    .gte("work_date", from)
    .lte("work_date", to)
    .order("started_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((r: any) => ({ id: r.id, startedAt: r.started_at, endedAt: r.ended_at, minutes: Number(r.worked_minutes), projectId: r.project_id ?? null, stale: !r.ended_at && Date.now() - new Date(r.started_at).getTime() > STALE_ENTRY_MS }));
}

/** Neuždaryti darbo laiko įrašai, kurie atviri ilgiau nei riba (greičiausiai pamirštas „Baigti“). */
export async function getStaleEntries(ctx: SessionContext): Promise<StaleEntry[]> {
  const supabase = await createClient();
  const [{ data }, members] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id, user_id, started_at")
      .eq("company_id", ctx.company!.id)
      .is("ended_at", null)
      .lt("started_at", new Date(Date.now() - STALE_ENTRY_MS).toISOString())
      .order("started_at", { ascending: true })
      .limit(50),
    getMembers(ctx),
  ]);
  const names = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, memberLabel(m)] as const));
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, userId: r.user_id, name: names.get(r.user_id) ?? "Darbuotojas", startedAt: r.started_at }));
}

/** Gyva (dar neužšaldyta) mėnesio ataskaita: kiekvienam darbuotojui ir objektui, su suma pagal tos dienos įkainį. */
export async function computeMonthReport(ctx: SessionContext, ym: string): Promise<MonthReport> {
  const supabase = await createClient();
  const cid = ctx.company!.id;
  const { from, to } = monthRange(ym);
  const [{ data: entries }, { data: rateRows }, members, projects] = await Promise.all([
    supabase.from("time_entry_summary").select("user_id, project_id, work_date, worked_minutes, ended_at").eq("company_id", cid).gte("work_date", from).lte("work_date", to).limit(20000),
    supabase.from("member_rates").select("user_id, hourly_rate_cents, effective_from").eq("company_id", cid).order("effective_from", { ascending: true }),
    getMembers(ctx),
    getProjects(ctx),
  ]);

  const rates = new Map<string, { from: string; cents: number }[]>();
  for (const r of (rateRows ?? []) as any[]) {
    const list = rates.get(r.user_id) ?? [];
    list.push({ from: r.effective_from, cents: r.hourly_rate_cents });
    rates.set(r.user_id, list);
  }
  const rateAt = (userId: string, date: string): number | null => {
    let found: number | null = null;
    for (const r of rates.get(userId) ?? []) if (r.from <= date) found = r.cents;
    return found;
  };

  const nameOf = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, memberLabel(m)] as const));
  const projectName = new Map(projects.map((p) => [p.id, p.name] as const));

  type Acc = { minutes: number; amount: number; missing: number; open: number; proj: Map<string, { minutes: number; amount: number }> };
  const perUser = new Map<string, Acc>();
  const perProject = new Map<string, { minutes: number; amount: number }>();
  for (const e of (entries ?? []) as any[]) {
    const minutes = Number(e.worked_minutes ?? 0);
    const rate = rateAt(e.user_id, e.work_date);
    const amount = rate === null ? 0 : (minutes * rate) / 60;
    const key = e.project_id ?? "";
    const acc = perUser.get(e.user_id) ?? { minutes: 0, amount: 0, missing: 0, open: 0, proj: new Map() };
    acc.minutes += minutes;
    acc.amount += amount;
    if (rate === null) acc.missing += minutes;
    if (!e.ended_at) acc.open += 1;
    const p = acc.proj.get(key) ?? { minutes: 0, amount: 0 };
    p.minutes += minutes;
    p.amount += amount;
    acc.proj.set(key, p);
    perUser.set(e.user_id, acc);
    const g = perProject.get(key) ?? { minutes: 0, amount: 0 };
    g.minutes += minutes;
    g.amount += amount;
    perProject.set(key, g);
  }

  const line = (key: string, v: { minutes: number; amount: number }): ReportProjectLine => ({
    projectId: key || null,
    name: key ? projectName.get(key) ?? "Objektas" : "Be objekto",
    minutes: v.minutes,
    amountCents: Math.round(v.amount),
  });
  const byMinutes = (a: { minutes: number }, b: { minutes: number }) => b.minutes - a.minutes;

  const rows: ReportRow[] = [...perUser.entries()]
    .map(([userId, a]) => ({
      userId,
      name: String(nameOf.get(userId) ?? "Buvęs darbuotojas"),
      minutes: a.minutes,
      amountCents: Math.round(a.amount),
      missingRateMinutes: a.missing,
      rateCents: rateAt(userId, to),
      openCount: a.open,
      byProject: [...a.proj.entries()].map(([k, v]) => line(k, v)).sort(byMinutes),
      approvedAt: null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "lt"));

  return {
    ym,
    rows,
    byProject: [...perProject.entries()].map(([k, v]) => line(k, v)).sort(byMinutes),
    totalMinutes: rows.reduce((s, r) => s + r.minutes, 0),
    totalAmountCents: rows.reduce((s, r) => s + r.amountCents, 0),
    missingRateMinutes: rows.reduce((s, r) => s + r.missingRateMinutes, 0),
    openCount: rows.reduce((s, r) => s + r.openCount, 0),
    approvedCount: 0,
  };
}

/** Ar tai patvirtinto mėnesio užšaldyta ataskaitos eilutė (snapshot). */
type Snapshot = { name?: string; minutes?: number; amountCents?: number; missingRateMinutes?: number; rateCents?: number | null; byProject?: ReportProjectLine[] };

/**
 * Mėnesio ataskaita: patvirtintiems darbuotojams rodomi užšaldyti (patvirtinimo metu išsaugoti) skaičiai,
 * kitiems – gyvi.
 */
export async function getMonthReport(ctx: SessionContext, ym: string): Promise<MonthReport> {
  const supabase = await createClient();
  const [live, { data: approvals }] = await Promise.all([
    computeMonthReport(ctx, ym),
    supabase.from("time_approvals").select("user_id, snapshot, approved_at, minutes").eq("company_id", ctx.company!.id).eq("month", `${ym}-01`),
  ]);
  const approved = new Map(((approvals ?? []) as any[]).map((a) => [a.user_id as string, a] as const));
  if (approved.size === 0) return live;

  const members = await getMembers(ctx);
  const nameOf = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, memberLabel(m)] as const));
  const rows: ReportRow[] = live.rows.map((r) => {
    const a = approved.get(r.userId);
    if (!a) return r;
    const snap = (a.snapshot ?? {}) as Snapshot;
    return {
      ...r,
      minutes: Number(a.minutes),
      amountCents: snap.amountCents ?? r.amountCents,
      missingRateMinutes: snap.missingRateMinutes ?? 0,
      rateCents: snap.rateCents === undefined ? r.rateCents : snap.rateCents,
      byProject: snap.byProject ?? r.byProject,
      openCount: 0,
      approvedAt: a.approved_at as string,
    };
  });
  for (const [userId, a] of approved) {
    if (rows.some((r) => r.userId === userId)) continue;
    const snap = (a.snapshot ?? {}) as Snapshot;
    rows.push({ userId, name: String(snap.name ?? nameOf.get(userId) ?? "Buvęs darbuotojas"), minutes: Number(a.minutes), amountCents: snap.amountCents ?? 0, missingRateMinutes: snap.missingRateMinutes ?? 0, rateCents: snap.rateCents ?? null, openCount: 0, byProject: snap.byProject ?? [], approvedAt: a.approved_at });
  }
  rows.sort((x, y) => x.name.localeCompare(y.name, "lt"));

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

/** Kada patvirtintas vieno darbuotojo mėnuo (null – nepatvirtintas). */
export async function getApprovalAt(ctx: SessionContext, userId: string, ym: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("time_approvals").select("approved_at").eq("company_id", ctx.company!.id).eq("user_id", userId).eq("month", `${ym}-01`).maybeSingle();
  return (data?.approved_at as string | undefined) ?? null;
}

/* ------------------------------------------------------------------ objekto kortelė */
export async function getProject(ctx: SessionContext, id: string): Promise<ProjectRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, address, order_no, notes, status, client_name, client_phone, client_email")
    .eq("company_id", ctx.company!.id)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const p = data as any;
  return { id: p.id, name: p.name, address: p.address, orderNo: p.order_no, notes: p.notes, archived: p.status === "archived", clientName: p.client_name ?? null, clientPhone: p.client_phone ?? null, clientEmail: p.client_email ?? null };
}

/** Objekto failai su laikinomis nuorodomis (privati saugykla). */
export async function getProjectFiles(ctx: SessionContext, projectId: string): Promise<ProjectFile[]> {
  const supabase = await createClient();
  const [{ data }, members] = await Promise.all([
    supabase
      .from("attachments")
      .select("id, file_name, mime_type, size_bytes, created_at, storage_path, uploaded_by")
      .eq("company_id", ctx.company!.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(200),
    getMembers(ctx),
  ]);
  const rows = (data ?? []) as any[];
  const urls = await signPaths(rows.map((r) => r.storage_path as string));
  const names = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, memberLabel(m)] as const));
  return rows.map((r) => ({
    id: r.id,
    name: r.file_name,
    mime: r.mime_type,
    size: Number(r.size_bytes),
    createdAt: r.created_at,
    url: urls.get(r.storage_path) ?? null,
    uploaderName: String(names.get(r.uploaded_by) ?? "Darbuotojas"),
  }));
}

/** Objekto medžiagos (trūkstamos pirmos). */
export async function getProjectMaterials(ctx: SessionContext, projectId: string): Promise<ProjectMaterial[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_request_items")
    .select("id, material_name, quantity, unit, status, created_at, material_requests!inner(project_id)")
    .eq("company_id", ctx.company!.id)
    .eq("material_requests.project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = ((data ?? []) as any[]).map((r) => ({ id: r.id as string, name: r.material_name as string, quantity: Number(r.quantity), unit: r.unit as string, purchased: r.status === "purchased" }));
  return [...items.filter((i) => !i.purchased), ...items.filter((i) => i.purchased)];
}

/** Objekte išdirbtos valandos (viso ir šį mėnesį), pagal darbuotoją. */
export async function getProjectHours(ctx: SessionContext, projectId: string): Promise<ProjectHours> {
  const supabase = await createClient();
  const [{ data }, members] = await Promise.all([
    supabase.from("time_entry_summary").select("user_id, work_date, worked_minutes").eq("company_id", ctx.company!.id).eq("project_id", projectId).limit(20000),
    getMembers(ctx),
  ]);
  const names = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, memberLabel(m)] as const));
  const { from, to } = monthRange(monthKey(todayKey()));
  const per = new Map<string, number>();
  let total = 0;
  let month = 0;
  for (const r of (data ?? []) as any[]) {
    const m = Number(r.worked_minutes ?? 0);
    total += m;
    if (r.work_date >= from && r.work_date <= to) month += m;
    per.set(r.user_id, (per.get(r.user_id) ?? 0) + m);
  }
  return {
    totalMinutes: total,
    monthMinutes: month,
    byEmployee: [...per.entries()].map(([userId, minutes]) => ({ userId, name: String(names.get(userId) ?? "Buvęs darbuotojas"), minutes })).sort((a, b) => b.minutes - a.minutes),
  };
}
