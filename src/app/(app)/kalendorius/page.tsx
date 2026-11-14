import CarReminders from "@/components/CarReminders";
import MonthCalendar from "@/components/MonthCalendar";
import { requireContext } from "@/lib/auth/context";
import { getCars } from "@/lib/cars/queries";
import { todayKey } from "@/lib/dates";
import { getTasksForCalendar } from "@/lib/work/queries";

export const dynamic = "force-dynamic";

export default async function KalendoriusPage() {
  const ctx = await requireContext();
  const [tasks, cars] = await Promise.all([getTasksForCalendar(ctx), getCars(ctx)]);
  const today = todayKey();
  return (
    <>
      <CarReminders cars={cars} today={today} userId={ctx.userId} />
      <MonthCalendar today={today} tasks={tasks} />
    </>
  );
}
