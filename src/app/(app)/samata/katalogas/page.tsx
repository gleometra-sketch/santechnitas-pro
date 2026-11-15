import { redirect } from "next/navigation";
import CatalogManager from "@/components/estimates/CatalogManager";
import EstimateNav from "@/components/estimates/EstimateNav";
import { isAdmin, requireContext } from "@/lib/auth/context";
import { getCatalog } from "@/lib/estimates/queries";

export const dynamic = "force-dynamic";

export default async function KatalogasPage() {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/kurti-imone");
  if (!isAdmin(ctx.role)) redirect("/darbai");
  const { rows, truncated, error } = await getCatalog(ctx);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Sąmata</h1>
      <EstimateNav active="catalog" />
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-medium text-danger">Nepavyko nuskaityti katalogo: {error}</p>}
      <CatalogManager items={rows} truncated={truncated} />
    </div>
  );
}
