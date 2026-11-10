import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import { monthRange } from "@/lib/dates";
import { STALE_ENTRY_MS } from "@/lib/work/types";
import type { AdminTask, MemberRow, ProjectRow, StaleEntry, TimeRow } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = (v: any) => (Array.isArray(v) ? v[0] : v);

export async function getProjects(ctx: SessionContext): Promise<ProjectRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, address, order_no, notes, status")
    .eq("company_id", ctx.company!.id)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((p: any) => ({ id: p.id, name: p.name, address: p.address, orderNo: p.order_no, notes: p.notes, archived: p.status === "archived" }));
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
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const p of profiles ?? []) if (p.full_name?.trim()) names.set(p.id, p.full_name.trim());
  }
  return rows.map((r) => ({ id: r.id, userId: r.user_id, email: r.email, name: r.user_id ? names.get(r.user_id) ?? null : null, role: r.role, status: r.status, timeMode: r.time_mode === "project" || r.time_mode === "hours" ? r.time_mode : null }));
});

export const memberLabel = (m: Pick<MemberRow, "name" | "email">) => m.name ?? m.email;

export async function getAdminTasks(ctx: SessionContext, f: { assigneeId: string | null; status: "open" | "done" | "all" }): Promise<AdminTask[]> {
  const supabase = await createClient();
  let q = supabase
    .from("tasks")
    .select("id, title, description, scheduled_date, status, project_id, assigned_to, project:projects(id, name), task_checklist_items(id, title, is_done, position)")
    .eq("company_id", ctx.company!.id);
  if (f.assigneeId) q = q.eq("assigned_to", f.assigneeId);
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
