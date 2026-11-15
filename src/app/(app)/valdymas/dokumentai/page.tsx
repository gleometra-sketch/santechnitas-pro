import Link from "next/link";
import CompanyProfileForm from "@/components/documents/CompanyProfileForm";
import { getProjects } from "@/lib/admin/queries";
import { requireContext } from "@/lib/auth/context";
import { getCompanyProfile, getDocuments } from "@/lib/documents/queries";
import { KIND_LABEL, STATUS_LABEL, STATUS_STYLE, eur } from "@/lib/documents/logic";

export const dynamic = "force-dynamic";

export default async function DokumentaiPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project } = await searchParams;
  const ctx = await requireContext();
  const [docs, projects, profile] = await Promise.all([getDocuments(ctx), getProjects(ctx), getCompanyProfile(ctx)]);
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const shown = project ? docs.filter((d) => d.projectId === project) : docs;
  const q = project ? `&project=${project}` : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Link href={`/valdymas/dokumentai/naujas?kind=estimate${q}`} className="flex min-h-12 items-center rounded-2xl bg-accent px-5 font-semibold text-white">Nauja sąmata</Link>
        <Link href={`/valdymas/dokumentai/naujas?kind=contract${q}`} className="flex min-h-12 items-center rounded-2xl border border-black/15 px-5 font-semibold">Nauja sutartis</Link>
      </div>

      {project && <p className="rounded-2xl bg-accent-soft p-3 text-sm">Rodomi tik objekto „{names.get(project) ?? "?"}“ dokumentai. <Link href="/valdymas/dokumentai" className="underline">Rodyti visus</Link></p>}

      {shown.length === 0 && <p className="rounded-2xl bg-white p-4 text-muted shadow-card">Dokumentų dar nėra. Sukurkite pirmą sąmatą arba sutartį.</p>}
      {shown.map((d) => (
        <Link key={d.id} href={`/valdymas/dokumentai/${d.id}`} className="block rounded-2xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted">{KIND_LABEL[d.kind]} Nr. {d.number}</p>
              <p className="text-lg font-bold">{d.title}</p>
              <p className="text-sm text-muted">{d.clientName}{d.projectId && names.get(d.projectId) ? ` · ${names.get(d.projectId)}` : ""}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[d.status]}`}>{STATUS_LABEL[d.status]}</span>
              <p className="mt-2 font-bold">{eur(d.totalGross)}</p>
            </div>
          </div>
        </Link>
      ))}

      <details className="rounded-2xl bg-white p-4 shadow-card">
        <summary className="cursor-pointer text-lg font-bold">Įmonės rekvizitai</summary>
        <CompanyProfileForm initial={profile} />
      </details>
    </div>
  );
}
