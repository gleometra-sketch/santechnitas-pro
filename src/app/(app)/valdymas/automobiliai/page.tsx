import CarsAdmin from "@/components/admin/CarsAdmin";
import { getMembers } from "@/lib/admin/queries";
import { requireContext } from "@/lib/auth/context";
import { getCarAssignments, getCarsResult } from "@/lib/cars/queries";
import { todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AutomobiliaiPage() {
  const ctx = await requireContext();
  const [{ cars, error }, assignments, members] = await Promise.all([getCarsResult(ctx), getCarAssignments(ctx), getMembers(ctx)]);
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
  return <CarsAdmin cars={cars} drivers={drivers} assignments={assignments} today={todayKey()} />;
}
