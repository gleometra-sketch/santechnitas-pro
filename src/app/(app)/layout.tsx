import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { AccessExpired, TrialBanner } from "@/components/AccessNotices";
import { isAdmin, requireContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/kurti-imone");

  return (
    <>
      <AppHeader name={ctx.fullName ?? ctx.email} company={ctx.company.name} admin={isAdmin(ctx.role)} />
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-5">
        {ctx.hasAccess ? (
          <>
            <TrialBanner ctx={ctx} />
            {children}
          </>
        ) : (
          <AccessExpired ctx={ctx} />
        )}
      </main>
      <BottomNav showMaterials={isAdmin(ctx.role)} />
    </>
  );
}
