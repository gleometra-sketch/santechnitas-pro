import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { AccessExpired, TrialBanner } from "@/components/AccessNotices";
import { isAdmin, requireContext } from "@/lib/auth/context";
import { getCarsResult } from "@/lib/cars/queries";
import { canUse } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  if (!ctx.company) redirect("/kurti-imone");
  const admin = isAdmin(ctx.role);
  // Administratorius automobilių skiltį mato visada, vairuotojas – kai jam priskirtas automobilis.
  // Automobiliai ir Medžiagos priklauso nuo plano (Pro, Verslui).
  const carsInPlan = canUse(ctx.plan, "cars");
  const showCars = carsInPlan && (admin || (await getCarsResult(ctx)).cars.length > 0);

  return (
    <>
      <AppHeader name={ctx.fullName ?? ctx.email} company={ctx.company.name} admin={admin} />
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
      <BottomNav showMaterials={admin && canUse(ctx.plan, "materials")} showCars={showCars} showEstimate={admin} />
    </>
  );
}
