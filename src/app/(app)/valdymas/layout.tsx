import { redirect } from "next/navigation";
import AdminTabs from "@/components/admin/AdminTabs";
import StaleAlert from "@/components/admin/StaleAlert";
import { getStaleEntries } from "@/lib/admin/queries";
import { isAdmin, requireContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function ValdymasLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/kurti-imone");
  if (!isAdmin(ctx.role)) redirect("/darbai");
  const stale = await getStaleEntries(ctx);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Valdymas</h1>
      <AdminTabs />
      <StaleAlert entries={stale} />
      {children}
    </div>
  );
}
