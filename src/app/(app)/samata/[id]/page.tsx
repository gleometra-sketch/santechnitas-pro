import { notFound, redirect } from "next/navigation";
import EstimateEditor from "@/components/estimates/EstimateEditor";
import { isAdmin, requireContext } from "@/lib/auth/context";
import { getCatalog, getEstimate, getProjectOptions } from "@/lib/estimates/queries";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  if (!ctx.company) redirect("/kurti-imone");
  if (!isAdmin(ctx.role)) redirect("/darbai");
  if (!UUID.test(id)) notFound();

  const [estimate, catalog, projects] = await Promise.all([getEstimate(ctx, id), getCatalog(ctx), getProjectOptions(ctx)]);
  if (!estimate) notFound();
  return <EstimateEditor estimate={estimate} catalog={catalog.rows} catalogTruncated={catalog.truncated} projects={projects} />;
}
