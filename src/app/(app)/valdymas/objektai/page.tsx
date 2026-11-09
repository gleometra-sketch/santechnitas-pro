import ProjectsAdmin from "@/components/admin/ProjectsAdmin";
import { requireContext } from "@/lib/auth/context";
import { getProjects } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function ObjektaiPage() {
  const ctx = await requireContext();
  return <ProjectsAdmin projects={await getProjects(ctx)} />;
}
