"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActionContext, isAdmin } from "@/lib/auth/context";
import type { ActionResult } from "@/lib/work/types";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "./constants";

const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (error: string): ActionResult => ({ ok: false, error });
const refresh = () => revalidatePath("/", "layout");

const schema = z
  .object({
    projectId: z.string().uuid().nullable(),
    taskId: z.string().uuid().nullable(),
    path: z.string().min(10).max(300).regex(/^[A-Za-z0-9\-_/.]+$/, "Neteisingas failo kelias."),
    name: z.string().trim().min(1, "Failas be pavadinimo.").max(200, "Per ilgas failo pavadinimas."),
    mime: z.enum(ALLOWED_MIME, { errorMap: () => ({ message: "Šio tipo failų įkelti negalima." }) }),
    size: z.number().int().min(1, "Tuščias failas.").max(MAX_FILE_BYTES, "Failas per didelis (iki 25 MB)."),
  })
  .refine((v) => v.projectId || v.taskId, "Nenurodytas objektas ar darbas.");

/**
 * Užregistruoja jau į saugyklą įkeltą failą (įkėlimas vyksta tiesiai iš naršyklės, kad nereikėtų siųsti failo per serverį).
 * Kelias privalo prasidėti įmonės ID – tai papildomai tikrina ir duomenų bazė.
 */
export async function registerAttachment(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!ctx.companyId) return fail("Pirmiausia sukurkite įmonę.");
  const v = parsed.data;
  if (!v.path.startsWith(`${ctx.companyId}/`) || v.path.includes("..")) return fail("Neteisingas failo kelias.");

  const db = await createClient();
  const { error } = await db.from("attachments").insert({
    company_id: ctx.companyId,
    uploaded_by: ctx.userId,
    project_id: v.projectId,
    task_id: v.taskId,
    storage_path: v.path,
    file_name: v.name,
    mime_type: v.mime,
    size_bytes: v.size,
  });
  refresh();
  if (error) return fail(error.code === "42501" ? "Neturite teisės arba įmonės prieiga sustabdyta." : "Nepavyko išsaugoti failo.");
  return ok();
}

/** Ištrina failą (saugyklą ir įrašą). Tik administratorius. */
export async function deleteAttachment(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return fail("Neteisingas įrašas.");
  const ctx = await getActionContext();
  if (!ctx?.companyId) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!isAdmin(ctx.role)) return fail("Failus trinti gali tik administratorius.");

  const db = await createClient();
  const { data: row } = await db.from("attachments").select("storage_path").eq("id", id).eq("company_id", ctx.companyId).maybeSingle();
  if (!row) return fail("Failas nerastas.");
  const { error: rmErr } = await db.storage.from("attachments").remove([row.storage_path as string]);
  if (rmErr) return fail("Nepavyko ištrinti failo iš saugyklos.");
  const { error } = await db.from("attachments").delete().eq("id", id).eq("company_id", ctx.companyId);
  refresh();
  return error ? fail("Nepavyko ištrinti.") : ok("Failas ištrintas.");
}
