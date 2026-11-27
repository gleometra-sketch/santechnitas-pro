import MembersAdmin from "@/components/admin/MembersAdmin";
import { requireContext } from "@/lib/auth/context";
import { getMembers } from "@/lib/admin/queries";
import { getPlanUsage } from "@/lib/plans-usage";
import { todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DarbuotojaiPage() {
  const ctx = await requireContext();
  const [members, usage] = await Promise.all([getMembers(ctx), getPlanUsage(ctx)]);
  return <MembersAdmin members={members} selfId={ctx.userId} companyMode={ctx.company?.timeMode ?? "hours"} today={todayKey()} seats={usage ? { used: usage.seats.used, limit: usage.seats.limit } : null} />;
}
