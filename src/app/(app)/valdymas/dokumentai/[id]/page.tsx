import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import DocumentEditor, { EMPTY_ITEM, type Draft } from "@/components/documents/DocumentEditor";
import DocumentStatusPanel from "@/components/documents/DocumentStatusPanel";
import { getProjects } from "@/lib/admin/queries";
import { requireContext } from "@/lib/auth/context";
import { todayKey } from "@/lib/dates";
import { getCompanyProfile, getDocumentDetail, getDocuments } from "@/lib/documents/queries";
import type { DocKind } from "@/lib/documents/logic";
import type { DocumentDetail } from "@/lib/documents/types";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const blank = (kind: DocKind): Draft => ({
  kind, title: "", projectId: "", estimateId: "", clientName: "", clientEmail: "", clientPhone: "", clientAddress: "", workAddress: "",
  vatRate: "21", validUntil: "", notes: "", body: "", totalGross: "", items: [{ ...EMPTY_ITEM }],
});
const fromDoc = (d: DocumentDetail): Draft => ({
  id: d.id, kind: d.kind, title: d.title, projectId: d.projectId ?? "", estimateId: d.estimateId ?? "", clientName: d.clientName,
  clientEmail: d.clientEmail ?? "", clientPhone: d.clientPhone ?? "", clientAddress: d.clientAddress ?? "", workAddress: d.workAddress ?? "",
  vatRate: String(d.vatRate), validUntil: d.validUntil ?? "", notes: d.notes ?? "", body: d.body ?? "", totalGross: d.kind === "contract" ? String(d.totalGross) : "",
  items: d.items.length ? d.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unit: i.unit, unit_price: String(i.unit_price) })) : [{ ...EMPTY_ITEM }],
});

export default async function DokumentoPuslapis({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string; project?: string; from?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (id !== "naujas" && !UUID.test(id)) notFound();
  const ctx = await requireContext();
  const [projects, seller, docs] = await Promise.all([getProjects(ctx), getCompanyProfile(ctx), getDocuments(ctx)]);
  const estimates = docs.filter((d) => d.kind === "estimate");
  const today = todayKey();
  const back = <Link href="/valdymas/dokumentai" className="text-sm font-semibold underline">← Visi dokumentai</Link>;

  if (id === "naujas") {
    const kind: DocKind = sp.kind === "contract" ? "contract" : "estimate";
    const initial = blank(kind);
    const proj = projects.find((p) => p.id === sp.project);
    if (proj) Object.assign(initial, { projectId: proj.id, clientName: proj.clientName ?? "", clientEmail: proj.clientEmail ?? "", clientPhone: proj.clientPhone ?? "", workAddress: proj.address ?? "", title: `${kind === "estimate" ? "Sąmata" : "Sutartis"}: ${proj.name}` });
    const base = kind === "contract" && sp.from && UUID.test(sp.from) ? await getDocumentDetail(ctx, sp.from) : null;
    if (base && base.kind === "estimate") {
      Object.assign(initial, { estimateId: base.id, projectId: base.projectId ?? initial.projectId, clientName: base.clientName, clientEmail: base.clientEmail ?? "", clientPhone: base.clientPhone ?? "",
        clientAddress: base.clientAddress ?? "", workAddress: base.workAddress ?? "", vatRate: String(base.vatRate), totalGross: String(base.totalGross), title: `Sutartis: ${base.title}` });
    }
    return <div className="space-y-4">{back}<DocumentEditor initial={initial} projects={projects} estimates={estimates} seller={seller} today={today} /></div>;
  }

  const doc = await getDocumentDetail(ctx, id);
  if (!doc) notFound();
  if (doc.status === "draft") {
    return <div className="space-y-4">{back}<DocumentEditor initial={fromDoc(doc)} projects={projects} estimates={estimates} seller={seller} today={today} /></div>;
  }
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || `https://${(await headers()).get("host") ?? "localhost:3000"}`;
  const url = doc.publicToken ? `${origin}/d/${doc.publicToken}` : null;
  return (
    <div className="space-y-4">
      {back}
      <DocumentStatusPanel doc={doc} url={url} projectName={projects.find((p) => p.id === doc.projectId)?.name ?? null} />
    </div>
  );
}
