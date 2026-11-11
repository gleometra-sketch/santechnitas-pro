/** Saugyklos (Supabase bucket „attachments“) ribos; sutampa su migracijomis 0005 ir 0013. */
export const MAX_FILE_BYTES = 26_214_400; // 25 MB

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

const BY_EXT: Record<string, AllowedMime> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heic",
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Failo tipas pagal naršyklės nurodytą arba (jei tuščias, pvz. HEIC) pagal plėtinį. Null – neleidžiamas. */
export function guessMime(file: { name: string; type: string }): AllowedMime | null {
  if ((ALLOWED_MIME as readonly string[]).includes(file.type)) return file.type as AllowedMime;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXT[ext] ?? null;
}

export const formatBytes = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
