import MembersAdmin from "@/components/admin/MembersAdmin";
import { requireContext } from "@/lib/auth/context";
import { getMembers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function DarbuotojaiPage() {
  const ctx = await requireContext();
  return <MembersAdmin members={await getMembers(ctx)} selfId={ctx.userId} />;
}
