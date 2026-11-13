import CarsAdmin from "@/components/admin/CarsAdmin";
import { getMembers } from "@/lib/admin/queries";
import { requireContext } from "@/lib/auth/context";
import { getCarAssignments, getCars } from "@/lib/cars/queries";
import { todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AutomobiliaiPage() {
  const ctx = await requireContext();
  const [cars, assignments, members] = await Promise.all([getCars(ctx), getCarAssignments(ctx), getMembers(ctx)]);
  const drivers = members
    .filter((m) => m.status === "active" && m.userId)
    .map((m) => ({ userId: m.userId as string, name: m.name ?? m.email }));
  return <CarsAdmin cars={cars} drivers={drivers} assignments={assignments} today={todayKey()} />;
}
