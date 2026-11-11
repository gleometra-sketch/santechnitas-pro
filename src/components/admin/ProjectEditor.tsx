"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateProject } from "@/lib/admin/actions";
import type { ProjectRow } from "@/lib/admin/types";
import { ProjectForm } from "./ProjectsAdmin";
import { ghostBtn } from "./ui";

export default function ProjectEditor({ project }: { project: ProjectRow }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return <button onClick={() => setOpen(true)} className={`${ghostBtn} flex w-full items-center justify-center gap-2`}><Pencil size={18} aria-hidden /> Redaguoti objektą ir klientą</button>;
  }
  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <ProjectForm
        initial={{ name: project.name, address: project.address ?? "", orderNo: project.orderNo ?? "", notes: project.notes ?? "", clientName: project.clientName ?? "", clientPhone: project.clientPhone ?? "", clientEmail: project.clientEmail ?? "" }}
        submitLabel="Išsaugoti"
        onSubmit={(f) => updateProject(project.id, f)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
