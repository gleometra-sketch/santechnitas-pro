import Link from "next/link";
import TasksAdmin from "@/components/admin/TasksAdmin";
import { requireContext } from "@/lib/auth/context";
import { getAdminTasks, getMembers, getProjects, memberLabel } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABS = [
  { s: "open", label: "Neužbaigti" },
  { s: "done", label: "Atlikti" },
  { s: "all", label: "Visi" },
] as const;

export default async function ValdymasDarbaiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const status = (["open", "done", "all"].includes(first(sp.b)) ? first(sp.b) : "open") as "open" | "done" | "all";
  const assigneeId = UUID.test(first(sp.d)) ? first(sp.d) : null;

  const [tasks, projects, members] = await Promise.all([getAdminTasks(ctx, { assigneeId, status }), getProjects(ctx), getMembers(ctx)]);
  const assignees = members.filter((m) => m.status === "active" && m.userId).map((m) => ({ id: m.userId as string, label: memberLabel(m) }));
  const href = (s: string) => `/valdymas/darbai?b=${s}${assigneeId ? `&d=${assigneeId}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 shadow-card">
        {TABS.map((t) => (
          <Link key={t.s} href={href(t.s)} aria-current={status === t.s ? "page" : undefined} className={`flex min-h-12 items-center justify-center rounded-xl text-sm font-semibold ${status === t.s ? "bg-navy text-white" : "text-muted"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <form method="get" action="/valdymas/darbai" className="flex gap-2">
        <input type="hidden" name="b" value={status} />
        <select name="d" defaultValue={assigneeId ?? ""} aria-label="Darbuotojas" className="min-h-12 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3">
          <option value="">Visi darbuotojai</option>
          {assignees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <button className="min-h-12 rounded-2xl border border-black/15 px-4 font-semibold">Rodyti</button>
      </form>
      <TasksAdmin tasks={tasks} projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, label: p.name + (p.address ? ` – ${p.address}` : "") }))} assignees={assignees} />
    </div>
  );
}
