import MembersAdmin from "@/components/admin/MembersAdmin";
import { requireContext } from "@/lib/auth/context";
import { getMembers } from "@/lib/admin/queries";
import { todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DarbuotojaiPage() {
  const ctx = await requireContext();
  return <MembersAdmin members={await getMembers(ctx)} selfId={ctx.userId} companyMode={ctx.company?.timeMode ?? "hours"} today={todayKey()} />;
}
