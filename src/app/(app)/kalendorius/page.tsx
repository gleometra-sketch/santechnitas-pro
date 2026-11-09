import MonthCalendar from "@/components/MonthCalendar";
import { requireContext } from "@/lib/auth/context";
import { todayKey } from "@/lib/dates";
import { getTasksForCalendar } from "@/lib/work/queries";

export const dynamic = "force-dynamic";

export default async function KalendoriusPage() {
  const ctx = await requireContext();
  const tasks = await getTasksForCalendar(ctx);
  return <MonthCalendar today={todayKey()} tasks={tasks} />;
}
