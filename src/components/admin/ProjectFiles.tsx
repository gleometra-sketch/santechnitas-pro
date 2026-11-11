"use client";

import { useState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import { deleteAttachment } from "@/lib/files/actions";
import { formatBytes } from "@/lib/files/constants";
import type { ProjectFile } from "@/lib/admin/types";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

const isPreviewable = (mime: string) => mime.startsWith("image/") && mime !== "image/heic";

export default function ProjectFiles({ companyId, projectId, files }: { companyId: string; projectId: string; files: ProjectFile[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const remove = (f: ProjectFile) => {
    if (!window.confirm(`Ištrinti failą „${f.name}“? Veiksmo atšaukti negalima.`)) return;
    start(async () => {
      const r = await deleteAttachment(f.id);
      setError(r.ok ? "" : r.error);
    });
  };

  return (
    <div className="space-y-3">
      <FileUploader companyId={companyId} projectId={projectId} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" label="Įkelti failus (nuotraukos, PDF, Word, Excel)" />
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      {files.length === 0 && <p className="text-sm text-muted">Failų dar nėra.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((f) => (
          <li key={f.id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
            <a href={f.url ?? undefined} target="_blank" rel="noopener noreferrer" className="block" aria-label={`Atidaryti: ${f.name}`}>
              {isPreviewable(f.mime) && f.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} loading="lazy" className="h-28 w-full object-cover" />
              ) : (
                <div className="flex h-28 items-center justify-center bg-surface text-muted"><FileText size={36} aria-hidden /></div>
              )}
            </a>
            <div className="p-2 text-xs">
              <p className="truncate font-semibold" title={f.name}>{f.name}</p>
              <p className="text-muted">{formatBytes(f.size)} · {fmt(f.createdAt)}</p>
              <p className="truncate text-muted">{f.uploaderName}</p>
              <button disabled={pending} onClick={() => remove(f)} aria-label={`Ištrinti: ${f.name}`} className="mt-1 flex min-h-9 items-center gap-1 rounded-lg px-1 font-semibold text-danger disabled:opacity-60">
                <Trash2 size={14} aria-hidden /> Ištrinti
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
