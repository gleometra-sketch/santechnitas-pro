import CarsOverview from "@/components/CarsOverview";
import UpgradeNotice from "@/components/plans/UpgradeNotice";
import { isAdmin, requireContext } from "@/lib/auth/context";
import { getCarsResult } from "@/lib/cars/queries";
import { todayKey } from "@/lib/dates";
import { canUse } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AutomobiliaiPage() {
  const ctx = await requireContext();
  const admin = isAdmin(ctx.role);
  if (!canUse(ctx.plan, "cars")) return <UpgradeNotice feature="cars" admin={admin} />;
  const { cars, error } = await getCarsResult(ctx);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Automobiliai</h1>
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 font-medium text-danger">
          {admin
            ? "Automobilių modulis duomenų bazėje neparuoštas. Supabase SQL Editor paleiskite supabase/migrations/0015_cars.sql ir atnaujinkite puslapį."
            : "Automobilių skiltis dar neparuošta. Kreipkitės į administratorių."}
        </p>
      ) : (
        <CarsOverview cars={cars} today={todayKey()} userId={ctx.userId} admin={admin} />
      )}
    </div>
  );
}
