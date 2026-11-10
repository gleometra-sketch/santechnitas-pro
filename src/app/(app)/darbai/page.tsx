import WorkClock from "@/components/WorkClock";
import OfficeNote from "@/components/OfficeNote";
import MaterialRequest from "@/components/MaterialRequest";
import TaskCard from "@/components/TaskCard";
import { requireContext } from "@/lib/auth/context";
import { addDays, longDayLabel, todayKey, weekStart } from "@/lib/dates";
import { getMyMaterialRequests, getMyNotes, getMyProjects, getTasksForList, getWorkState } from "@/lib/work/queries";
import type { TaskView } from "@/lib/work/types";

export const dynamic = "force-dynamic";

function byDay(tasks: TaskView[]) {
  const days = [...new Set(tasks.map((t) => t.date ?? ""))].sort();
  return days.map((d) => ({ date: d, tasks: tasks.filter((t) => (t.date ?? "") === d) }));
}

export default async function DarbaiPage() {
  const ctx = await requireContext();
  const today = todayKey();
  const [work, tasks, notes, projects, requests] = await Promise.all([
    getWorkState(ctx),
    getTasksForList(ctx),
    getMyNotes(ctx),
    getMyProjects(ctx),
    getMyMaterialRequests(ctx),
  ]);

  const open = tasks.filter((t) => t.status !== "done");
  const finished = tasks.filter((t) => t.status === "done").sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1)).slice(0, 10);

  const thisWeek = weekStart(today);
  const nextWeek = addDays(thisWeek, 7);
  const afterNext = addDays(thisWeek, 14);
  const overdue = open.filter((t) => t.date && t.date < today);
  const sections = [
    { title: "Ši savaitė", list: open.filter((t) => t.date && t.date >= today && t.date < nextWeek) },
    { title: "Kita savaitė", list: open.filter((t) => t.date && t.date >= nextWeek && t.date < afterNext) },
    { title: "Vėliau", list: open.filter((t) => t.date && t.date >= afterNext) },
    { title: "Be datos", list: open.filter((t) => !t.date) },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Darbai</h1>
      <WorkClock status={work.status} workedMsAtRender={work.workedMsAtRender} todayMinutes={work.todayMinutes} mode={work.mode} projects={work.projects} projectId={work.projectId} defaultProjectId={work.defaultProjectId} />
      <OfficeNote notes={notes} />
      <MaterialRequest projects={projects} requests={requests} />

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Suplanuoti darbai <span className="ml-1 text-sm text-muted">{open.length}</span></h2>
        {open.length === 0 && <p className="text-muted">Jums paskirtų darbų kol kas nėra.</p>}

        {overdue.length > 0 && (
          <div className="space-y-3">
            <h3 className="border-b-2 border-danger pb-1 font-bold text-danger">Pavėluoti</h3>
            {byDay(overdue).map((d) => (
              <div key={d.date} className="space-y-2">
                <p className="text-lg font-bold text-danger">{longDayLabel(d.date)}</p>
                {d.tasks.map((t) => <TaskCard key={t.id} task={t} today={today} />)}
              </div>
            ))}
          </div>
        )}

        {sections.map((s) =>
          s.list.length === 0 ? null : (
            <div key={s.title} className="space-y-3">
              <h3 className="border-b-2 border-accent pb-1 font-bold text-accent">{s.title}</h3>
              {byDay(s.list).map((d) => (
                <div key={d.date || "none"} className="space-y-2">
                  {d.date && <p className="text-lg font-bold">{longDayLabel(d.date)}</p>}
                  {d.tasks.map((t) => <TaskCard key={t.id} task={t} today={today} />)}
                </div>
              ))}
            </div>
          )
        )}

        {finished.length > 0 && (
          <details className="space-y-3">
            <summary className="min-h-11 cursor-pointer font-bold text-muted">Atlikti darbai ({finished.length})</summary>
            <div className="mt-3 space-y-3">{finished.map((t) => <TaskCard key={t.id} task={t} today={today} />)}</div>
          </details>
        )}
      </section>
    </div>
  );
}
