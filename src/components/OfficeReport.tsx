"use client";

import { useState } from "react";
import { NotebookPen, PackagePlus } from "lucide-react";
import MaterialRequest from "@/components/MaterialRequest";
import OfficeNote from "@/components/OfficeNote";
import type { MaterialRequestView, NoteView } from "@/lib/work/types";

type Tab = "note" | "materials";

/** „Pranešti biurui“: vienas blokas su dviem skirtukais (laisva pastaba arba medžiagų prašymas su kiekiais). */
export default function OfficeReport({ notes, requests }: { notes: NoteView[]; requests: MaterialRequestView[] }) {
  const [tab, setTab] = useState<Tab>("note");
  const tabs: { id: Tab; label: string; Icon: typeof NotebookPen }[] = [
    { id: "note", label: "Pastaba", Icon: NotebookPen },
    { id: "materials", label: "Medžiagos", Icon: PackagePlus },
  ];
  return (
    <section id="pranesti" aria-label="Pranešti biurui" className="scroll-mt-20 rounded-card bg-white p-4 shadow-card sm:p-5">
      <h2 className="mb-3 text-lg font-bold">Pranešti biurui</h2>
      <div role="tablist" aria-label="Pranešimo tipas" className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold ${tab === id ? "bg-white shadow-card" : "text-muted"}`}
          >
            <Icon size={18} aria-hidden /> {label}
          </button>
        ))}
      </div>
      {/* Abu skirtukai lieka prijungti, kad neįsiųsta forma neišsivalytų perjungus. */}
      <div role="tabpanel" id="panel-note" aria-labelledby="tab-note" hidden={tab !== "note"}>
        <OfficeNote notes={notes} />
      </div>
      <div role="tabpanel" id="panel-materials" aria-labelledby="tab-materials" hidden={tab !== "materials"}>
        <MaterialRequest requests={requests} />
      </div>
    </section>
  );
}
