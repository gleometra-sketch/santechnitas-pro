import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Mail, MapPin, Navigation, Package, Phone, User } from "lucide-react";
import ProjectEditor from "@/components/admin/ProjectEditor";
import ProjectFiles from "@/components/admin/ProjectFiles";
import { requireContext } from "@/lib/auth/context";
import { getAdminTasks, getProject, getProjectFiles, getProjectHours, getProjectMaterials } from "@/lib/admin/queries";
import { formatDuration, shortDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = { planned: "Suplanuota", in_progress: "Vykdoma", done: "Atlikta" } as const;

export default async function ObjektoKortele({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await requireContext();
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const [files, tasks, materials, hours] = await Promise.all([
    getProjectFiles(ctx, id),
    getAdminTasks(ctx, { assigneeId: null, status: "all", projectId: id }),
    getProjectMaterials(ctx, id),
    getProjectHours(ctx, id),
  ]);
  const missing = materials.filter((m) => !m.purchased);
  const card = "rounded-card bg-white p-5 shadow-card";
  const h2 = "mb-3 flex items-center gap-2 text-lg font-bold";

  return (
    <div className="space-y-4">
      <Link href="/valdymas/objektai" className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted"><ArrowLeft size={16} aria-hidden /> Visi objektai</Link>

      <section className={card}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-extrabold leading-tight">{project.name}</h2>
          {project.archived && <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-muted">Archyvuota</span>}
        </div>
        {project.orderNo && <p className="mt-1 text-sm text-muted">Užsakymo nr. {project.orderNo}</p>}
        {project.address && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center gap-2 font-medium text-accent-dark">
            <MapPin size={18} aria-hidden /> {project.address} <Navigation size={14} aria-hidden />
          </a>
        )}
        {project.notes && <p className="mt-2 whitespace-pre-line text-sm">{project.notes}</p>}
      </section>

      <section className={card} aria-label="Klientas">
        <h3 className={h2}><User size={20} aria-hidden /> Klientas</h3>
        {project.clientName || project.clientPhone || project.clientEmail ? (
          <div className="space-y-1">
            {project.clientName && <p className="text-lg font-semibold">{project.clientName}</p>}
            {project.clientPhone && <a href={`tel:${project.clientPhone.replace(/[^\d+]/g, "")}`} className="flex min-h-11 items-center gap-2 font-medium text-accent-dark"><Phone size={18} aria-hidden /> {project.clientPhone}</a>}
            {project.clientEmail && <a href={`mailto:${project.clientEmail}`} className="flex min-h-11 items-center gap-2 font-medium text-accent-dark"><Mail size={18} aria-hidden /> {project.clientEmail}</a>}
          </div>
        ) : (
          <p className="text-sm text-muted">Kliento duomenų nėra. Įrašykite juos paspaudę „Redaguoti“.</p>
        )}
        <div className="mt-3"><ProjectEditor project={project} /></div>
      </section>

      <section className={card} aria-label="Failai">
        <h3 className={h2}>Failai ir nuotraukos</h3>
        <ProjectFiles companyId={ctx.company!.id} projectId={id} files={files} />
      </section>

      <section className={card} aria-label="Darbai">
        <h3 className={h2}><CalendarDays size={20} aria-hidden /> Darbai ({tasks.length})</h3>
        {tasks.length === 0 && <p className="text-sm text-muted">Šiame objekte darbų nėra. Juos kuriama skiltyje Valdymas → Darbai.</p>}
        <ul className="divide-y divide-black/5">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className={`font-semibold ${t.status === "done" ? "text-muted line-through" : ""}`}>{t.title}</p>
                <p className="text-sm text-muted">{t.assigneeName ?? "Nepaskirtas"} · {t.date ? shortDay(t.date) : "be datos"}{t.items.length > 0 && ` · ${t.items.filter((i) => i.isDone).length}/${t.items.length}`}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.status === "done" ? "bg-go-soft text-go-dark" : "bg-accent-soft text-accent-dark"}`}>{STATUS[t.status]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-label="Medžiagos">
        <h3 className={h2}><Package size={20} aria-hidden /> Medžiagos</h3>
        {materials.length === 0 ? (
          <p className="text-sm text-muted">Šiam objektui medžiagų nėra užsakyta.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted">Trūksta: {missing.length}, nupirkta: {materials.length - missing.length}. <Link href={`/medziagos?o=${id}&b=all`} className="font-semibold text-accent-dark underline">Atidaryti medžiagų sąraše</Link></p>
            <ul className="space-y-1">
              {materials.slice(0, 15).map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={m.purchased ? "text-muted line-through" : "font-medium"}>{m.name}</span>
                  <span className="shrink-0 tabular-nums text-muted">{String(m.quantity).replace(".", ",")} {m.unit}</span>
                </li>
              ))}
            </ul>
            {materials.length > 15 && <p className="mt-1 text-xs text-muted">Rodoma 15 iš {materials.length}.</p>}
          </>
        )}
      </section>

      <section className={card} aria-label="Valandos">
        <h3 className={h2}><Clock size={20} aria-hidden /> Valandos</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface p-3"><p className="text-xl font-extrabold">{formatDuration(hours.monthMinutes)}</p><p className="text-sm text-muted">Šį mėnesį</p></div>
          <div className="rounded-xl bg-surface p-3"><p className="text-xl font-extrabold">{formatDuration(hours.totalMinutes)}</p><p className="text-sm text-muted">Iš viso</p></div>
        </div>
        {hours.byEmployee.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {hours.byEmployee.map((e) => (
              <li key={e.userId} className="flex items-baseline justify-between gap-3 text-sm"><span>{e.name}</span><span className="tabular-nums font-semibold">{formatDuration(e.minutes)}</span></li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Valandos pagal objektą kaupiamos, kai darbuotojai pradėdami darbą pasirenka šį objektą (Valdymas → Darbuotojai → laiko apskaita pagal objektą).</p>
        )}
      </section>
    </div>
  );
}
