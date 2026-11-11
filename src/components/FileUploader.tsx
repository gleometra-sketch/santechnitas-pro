"use client";

import { useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { uploadFile } from "@/lib/files/upload";

/** Failų pasirinkimas ir įkėlimas (vienas po kito). Naudojama objekto kortelėje ir darbo kortelėje. */
export default function FileUploader({
  companyId,
  projectId,
  taskId = null,
  accept,
  label,
  photo = false,
}: {
  companyId: string;
  projectId: string | null;
  taskId?: string | null;
  accept: string;
  label: string;
  photo?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setErrors([]);
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(`Įkeliama ${i + 1} iš ${files.length}...`);
      const r = await uploadFile(files[i], { companyId, projectId, taskId });
      if (!r.ok) failed.push(r.error);
    }
    setBusy(false);
    setStatus(failed.length === files.length ? "" : `Įkelta: ${files.length - failed.length}`);
    setErrors(failed);
  };

  return (
    <div>
      <input ref={input} type="file" accept={accept} multiple className="sr-only" onChange={onPick} aria-label={label} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/50 font-semibold text-accent-dark disabled:opacity-60"
      >
        {photo ? <ImagePlus size={20} aria-hidden /> : <Upload size={20} aria-hidden />} {busy ? status : label}
      </button>
      {!busy && status && <p role="status" className="mt-1.5 text-sm font-medium text-go-dark">{status}</p>}
      {errors.length > 0 && (
        <ul role="alert" className="mt-1.5 space-y-0.5 text-sm font-medium text-danger">
          {errors.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
    </div>
  );
}
