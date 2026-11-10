import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth/context";
import { addDays, formatTime, monthKey, monthRange, shiftMonth, todayKey, weekStart } from "@/lib/dates";
import type { MaterialRequestView, NoteView, TaskView, WorkState } from "./types";

const TASK_SELECT =
  "id, title, description, scheduled_date, status, project:projects(id, name, address, order_no), task_checklist_items(id, title, is_done, position)";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTask(r: any): TaskView {
  const p = Array.isArray(r.project) ? r.project[0] : r.project;
  const items = [...(r.task_checklist_items ?? [])].sort((a: any, b: any) => a.position - b.position);
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.scheduled_date,
    status: r.status,
    projectId: p?.id ?? null,
    projectName: p?.name ?? null,
    address: p?.address ?? null,
    orderNo: p?.order_no ?? null,
    items: items.map((i: any) => ({ id: i.id, title: i.title, isDone: i.is_done })),
  };
}

/** Darbuotojui paskirti darbai: neužbaigti + neseniai užbaigti. */
export async function getTasksForList(ctx: SessionContext): Promise<TaskView[]> {
  const supabase = await createClient();
  const since = addDays(todayKey(), -14);
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("assigned_to", ctx.userId)
    .or(`status.neq.done,scheduled_date.gte.${since}`)
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .limit(300);
  return (data ?? []).map(mapTask);
}

export async function getTasksForCalendar(ctx: SessionContext): Promise<TaskView[]> {
  const supabase = await createClient();
  const today = todayKey();
  const from = addDays(today, -120);
  const to = addDays(today, 400);
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("assigned_to", ctx.userId)
    .or(`scheduled_date.is.null,and(scheduled_date.gte.${from},scheduled_date.lte.${to})`)
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .limit(500);
  return (data ?? []).map(mapTask);
}

export async function getMyNotes(ctx: SessionContext): Promise<NoteView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, body, is_done")
    .eq("author_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(15);
  return (data ?? []).map((n: any) => ({ id: n.id, body: n.body ?? "", isDone: n.is_done }));
}

export async function getMyMaterialRequests(ctx: SessionContext): Promise<MaterialRequestView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_requests")
    .select("id, created_at, comment, project:projects(name), items:material_request_items(id, material_name, quantity, unit, status)")
    .eq("employee_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []).map((r: any) => {
    const p = Array.isArray(r.project) ? r.project[0] : r.project;
    return {
      id: r.id,
      createdAt: r.created_at,
      comment: r.comment,
      projectName: p?.name ?? null,
      items: (r.items ?? []).map((i: any) => ({
        id: i.id,
        name: i.material_name,
        quantity: Number(i.quantity),
        unit: i.unit,
        purchased: i.status === "purchased",
      })),
    };
  });
}

/** Objektai, kuriuose darbuotojas turi darbų (RLS kitų neleidžia matyti). */
export async function getMyProjects(ctx: SessionContext) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("project:projects(id, name, address)")
    .eq("assigned_to", ctx.userId)
    .not("project_id", "is", null)
    .limit(200);
  const map = new Map<string, { id: string; name: string; address: string | null }>();
  for (const r of data ?? []) {
    const p: any = Array.isArray((r as any).project) ? (r as any).project[0] : (r as any).project;
    if (p) map.set(p.id, p);
  }
  return [...map.values()];
}

const sum = (rows: any[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.worked_minutes ?? 0), 0);

export async function getWorkState(ctx: SessionContext): Promise<WorkState> {
  const supabase = await createClient();
  const today = todayKey();
  const ws = weekStart(today);
  const byProject = ctx.timeMode === "project" && !!ctx.company;

  const [open, off, todayRows, weekRows, options, last] = await Promise.all([
    supabase.from("time_entries").select("id, started_at, project_id").eq("user_id", ctx.userId).is("ended_at", null).maybeSingle(),
    supabase.from("days_off").select("id").eq("user_id", ctx.userId).eq("day", today).maybeSingle(),
    supabase.from("time_entry_summary").select("worked_minutes").eq("user_id", ctx.userId).eq("work_date", today),
    supabase.from("time_entry_summary").select("worked_minutes").eq("user_id", ctx.userId).gte("work_date", ws).lte("work_date", addDays(ws, 6)),
    byProject ? supabase.rpc("time_project_options", { cid: ctx.company!.id }) : Promise.resolve({ data: [] as unknown[] }),
    byProject
      ? supabase.from("time_entries").select("project_id").eq("user_id", ctx.userId).not("project_id", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const projects = ((options.data ?? []) as any[]).map((p) => ({ id: p.id as string, name: p.name as string, address: (p.address ?? null) as string | null }));
  const lastId = (last.data as { project_id?: string } | null)?.project_id ?? null;
  const extra = {
    mode: ctx.timeMode,
    projects,
    projectId: (open.data?.project_id as string | null | undefined) ?? null,
    defaultProjectId: lastId && projects.some((p) => p.id === lastId) ? lastId : null,
  };

  const todayMinutes = sum(todayRows.data);
  const weekMinutes = sum(weekRows.data);

  if (open.data) {
    const { data: breaks } = await supabase.from("breaks").select("started_at, ended_at").eq("time_entry_id", open.data.id);
    const now = Date.now();
    let closed = 0;
    let openBreakStart: number | null = null;
    for (const b of breaks ?? []) {
      if (b.ended_at) closed += new Date(b.ended_at).getTime() - new Date(b.started_at).getTime();
      else openBreakStart = new Date(b.started_at).getTime();
    }
    const end = openBreakStart ?? now;
    const worked = Math.max(0, end - new Date(open.data.started_at).getTime() - closed);
    return { status: openBreakStart ? "break" : "working", workedMsAtRender: worked, todayMinutes, weekMinutes, ...extra };
  }
  if (off.data) return { status: "off", workedMsAtRender: 0, todayMinutes, weekMinutes, ...extra };
  return { status: (todayRows.data ?? []).length > 0 ? "done" : "idle", workedMsAtRender: 0, todayMinutes, weekMinutes, ...extra };
}

export type DayHours = { date: string; minutes: number; start: string; end: string | null };

export async function getMonthHours(ctx: SessionContext, ym: string) {
  const supabase = await createClient();
  const { from, to } = monthRange(ym);
  const { data } = await supabase
    .from("time_entry_summary")
    .select("started_at, ended_at, work_date, worked_minutes")
    .eq("user_id", ctx.userId)
    .gte("work_date", from)
    .lte("work_date", to)
    .order("started_at", { ascending: true });

  const byDay = new Map<string, DayHours>();
  for (const r of data ?? []) {
    const cur = byDay.get(r.work_date);
    const start = formatTime(r.started_at);
    const end = r.ended_at ? formatTime(r.ended_at) : null;
    if (!cur) byDay.set(r.work_date, { date: r.work_date, minutes: Number(r.worked_minutes), start, end });
    else {
      cur.minutes += Number(r.worked_minutes);
      cur.end = end;
    }
  }
  const days = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  return { days, totalMinutes: days.reduce((s, d) => s + d.minutes, 0) };
}

export async function getMonthTotals(ctx: SessionContext, currentYm: string, count = 6) {
  const supabase = await createClient();
  const first = monthRange(shiftMonth(currentYm, -(count - 1))).from;
  const { data } = await supabase
    .from("time_entry_summary")
    .select("work_date, worked_minutes")
    .eq("user_id", ctx.userId)
    .gte("work_date", first)
    .lte("work_date", monthRange(currentYm).to);
  const totals = new Map<string, number>();
  for (const r of data ?? []) totals.set(monthKey(r.work_date), (totals.get(monthKey(r.work_date)) ?? 0) + Number(r.worked_minutes));
  return Array.from({ length: count }, (_, i) => {
    const ym = shiftMonth(currentYm, -i);
    return { ym, minutes: totals.get(ym) ?? 0 };
  });
}
