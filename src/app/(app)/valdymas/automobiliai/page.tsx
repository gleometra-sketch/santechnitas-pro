import CarsAdmin from "@/components/admin/CarsAdmin";
import UpgradeNotice from "@/components/plans/UpgradeNotice";
import UsageMeter from "@/components/plans/UsageMeter";
import { getMembers } from "@/lib/admin/queries";
import { requireContext } from "@/lib/auth/context";
import { getCarAssignments, getCarsResult } from "@/lib/cars/queries";
import { todayKey } from "@/lib/dates";
import { canUse } from "@/lib/plans";
import { getPlanUsage } from "@/lib/plans-usage";

export const dynamic = "force-dynamic";

export default async function AutomobiliaiPage() {
  const ctx = await requireContext();
  if (!canUse(ctx.plan, "cars")) return <UpgradeNotice feature="cars" admin />;
  const [{ cars, error }, assignments, members, usage] = await Promise.all([getCarsResult(ctx), getCarAssignments(ctx), getMembers(ctx), getPlanUsage(ctx)]);
  if (error) {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 p-4 font-medium text-danger">
        Automobilių modulis duomenų bazėje neparuoštas. Supabase SQL Editor paleiskite supabase/migrations/0015_cars.sql ir atnaujinkite puslapį.
      </p>
    );
  }
  const drivers = members
    .filter((m) => m.status === "active" && m.userId)
    .map((m) => ({ userId: m.userId as string, name: m.name ?? m.email }));
  return (
    <div className="space-y-4">
      {usage && usage.cars.limit > 0 && (
        <section className="rounded-2xl bg-white p-3 shadow-card">
          <UsageMeter label="Aktyvūs automobiliai plane" used={usage.cars.used} limit={usage.cars.limit} hard />
          <p className="mt-2 text-xs text-muted">Pasiekus limitą naujo automobilio pridėti ar išjungto vėl įjungti negalima; išjunkite nenaudojamą arba pasirinkite aukštesnį planą.</p>
        </section>
      )}
      <CarsAdmin cars={cars} drivers={drivers} assignments={assignments} today={todayKey()} />
    </div>
  );
}
