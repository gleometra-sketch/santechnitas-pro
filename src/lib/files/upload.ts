import { createClient } from "@/lib/supabase/client";
import { registerAttachment } from "./actions";
import { MAX_FILE_BYTES, guessMime } from "./constants";

export type UploadResult = { ok: true } | { ok: false; error: string };

/** Dideles telefono nuotraukas sumažina (iki 2000 px, JPEG), kad įkėlimas būtų greitas. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/heic" || file.size < 1_500_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Įkelia failą tiesiai į saugyklą ir užregistruoja jį duomenų bazėje. */
export async function uploadFile(file: File, o: { companyId: string; projectId: string | null; taskId?: string | null }): Promise<UploadResult> {
  const original = guessMime(file);
  if (!original) return { ok: false, error: `${file.name}: šio tipo failų įkelti negalima.` };
  const prepared = await shrinkImage(file);
  const mime = guessMime(prepared) ?? original;
  if (prepared.size > MAX_FILE_BYTES) return { ok: false, error: `${file.name}: failas per didelis (iki 25 MB).` };

  const ext = (prepared.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  const path = `${o.companyId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from("attachments").upload(path, prepared, { contentType: mime, upsert: false });
  if (error) return { ok: false, error: `${file.name}: nepavyko įkelti.` };

  const r = await registerAttachment({ projectId: o.projectId, taskId: o.taskId ?? null, path, name: file.name, mime, size: prepared.size });
  return r.ok ? { ok: true } : { ok: false, error: `${file.name}: ${r.error}` };
}
