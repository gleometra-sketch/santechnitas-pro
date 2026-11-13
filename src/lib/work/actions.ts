"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActionContext, isAdmin } from "@/lib/auth/context";
import { isValidDayKey, todayKey } from "@/lib/dates";
import { notifyLater, notifyMaterialRequest, notifyNote, notifyWorkFinished, notifyWorkStarted } from "@/lib/telegram/notify";
import { UNITS, type ActionResult, type TimeMode } from "./types";

type Db = Awaited<ReturnType<typeof createClient>>;

const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (error: string): ActionResult => ({ ok: false, error });

function mapError(e: { code?: string; message?: string } | null, fallback: string): ActionResult {
  if (!e) return ok();
  if (e.code === "23505") return fail("Toks įrašas jau egzistuoja (pvz., darbas jau pradėtas).");
  if (e.code === "42501") return fail("Neturite teisės arba įmonės prieiga sustabdyta.");
  if (e.code === "23514" || e.code === "22023") return fail("Patikrinkite įvestus duomenis.");
  return fail(fallback);
}

async function guard(): Promise<{ db: Db; userId: string; companyId: string; admin: boolean; timeMode: TimeMode } | ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!ctx.companyId) return fail("Pirmiausia sukurkite įmonę.");
  return { db: await createClient(), userId: ctx.userId, companyId: ctx.companyId, admin: isAdmin(ctx.role), timeMode: ctx.timeMode };
}
const bad = (g: unknown): g is ActionResult => typeof g === "object" && g !== null && "ok" in g;
const refresh = () => revalidatePath("/", "layout");

/* ------------------------------------------------------------ darbo laikas */
export async function startWork(projectId?: string | null): Promise<ActionResult> {
  const g = await guard();
  if (bad(g)) return g;
  const byProject = g.timeMode === "project";
  if (byProject && !projectId) return fail("Pasirinkite objektą, kuriame dirbsite.");
  if (projectId && !idSchema.safeParse(projectId).success) return fail("Neteisingas objektas.");
  await g.db.from("days_off").delete().eq("user_id", g.userId).eq("day", todayKey());
  const { error } = await g.db
    .from("time_entries")
    .insert({ company_id: g.companyId, user_id: g.userId, project_id: byProject ? projectId : null, started_at: new Date().toISOString() });
  refresh();
  if (!error) notifyLater(() => notifyWorkStarted({ companyId: g.companyId, userId: g.userId, projectId: byProject ? projectId : null }));
  return mapError(error, "Nepavyko pradėti darbo.");
}

/** Dirbant perjungia į kitą objektą: ankstesnis laiko įrašas užbaigiamas, naujas prasideda tą pačią akimirką. */
export async function switchWorkProject(projectId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(projectId).success) return fail("Neteisingas objektas.");
  const g = await guard();
  if (bad(g)) return g;
  if (g.timeMode !== "project") return fail("Objekto pasirinkimas išjungtas.");
  const { error } = await g.db.rpc("switch_time_project", { p_project: projectId });
  refresh();
  if (error?.code === "P0001") return fail(error.message);
  if (!error) notifyLater(() => notifyWorkStarted({ companyId: g.companyId, userId: g.userId, projectId, switched: true }));
  return error ? mapError(error, "Nepavyko pakeisti objekto.") : ok("Objektas pakeistas.");
}

async function openEntryId(g: { db: Db; userId: string }) {
  const { data } = await g.db.from("time_entries").select("id").eq("user_id", g.userId).is("ended_at", null).maybeSingle();
  return data?.id as string | undefined;
}

export async function pauseWork(): Promise<ActionResult> {
  const g = await guard();
  if (bad(g)) return g;
  const entryId = await openEntryId(g);
  if (!entryId) return fail("Darbas nepradėtas.");
  const { error } = await g.db
    .from("breaks")
    .insert({ company_id: g.companyId, time_entry_id: entryId, started_at: new Date().toISOString() });
  refresh();
  return mapError(error, "Nepavyko pradėti pertraukos.");
}

export async function resumeWork(): Promise<ActionResult> {
  const g = await guard();
  if (bad(g)) return g;
  const entryId = await openEntryId(g);
  if (!entryId) return fail("Darbas nepradėtas.");
  const { error } = await g.db
    .from("breaks")
    .update({ ended_at: new Date().toISOString() })
    .eq("time_entry_id", entryId)
    .is("ended_at", null);
  refresh();
  return mapError(error, "Nepavyko baigti pertraukos.");
}

export async function finishWork(): Promise<ActionResult> {
  const g = await guard();
  if (bad(g)) return g;
  const entryId = await openEntryId(g);
  if (!entryId) return fail("Darbas nepradėtas.");
  const now = new Date().toISOString();
  await g.db.from("breaks").update({ ended_at: now }).eq("time_entry_id", entryId).is("ended_at", null);
  const { error } = await g.db.from("time_entries").update({ ended_at: now }).eq("id", entryId);
  refresh();
  if (!error) notifyLater(() => notifyWorkFinished({ companyId: g.companyId, userId: g.userId, entryId }));
  return mapError(error, "Nepavyko baigti darbo.");
}

export async function markDayOff(): Promise<ActionResult> {
  const g = await guard();
  if (bad(g)) return g;
  const { error } = await g.db.from("days_off").insert({ company_id: g.companyId, user_id: g.userId, day: todayKey() });
  refresh();
  return error?.code === "23505" ? ok() : mapError(error, "Nepavyko pažymėti.");
}

export async function undoDayOff(): Promise<ActionResult> {
  const g = await guard();
  if (bad(g)) return g;
  const { error } = await g.db.from("days_off").delete().eq("user_id", g.userId).eq("day", todayKey());
  refresh();
  return mapError(error, "Nepavyko atšaukti.");
}

/* ------------------------------------------------------------------ darbai */
const idSchema = z.string().uuid();

export async function toggleChecklistItem(itemId: string, isDone: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(itemId).success) return fail("Neteisingas įrašas.");
  const g = await guard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("task_checklist_items").update({ is_done: isDone }).eq("id", itemId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko išsaugoti.");
  return (data ?? []).length ? ok() : fail("Neturite teisės keisti šio punkto.");
}

export async function setTaskStatus(taskId: string, status: "planned" | "done"): Promise<ActionResult> {
  if (!idSchema.safeParse(taskId).success || !["planned", "done"].includes(status)) return fail("Neteisingi duomenys.");
  const g = await guard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("tasks").update({ status }).eq("id", taskId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko pakeisti būsenos.");
  return (data ?? []).length ? ok() : fail("Neturite teisės keisti šio darbo.");
}

export async function moveTask(taskId: string, date: string | null): Promise<ActionResult> {
  if (!idSchema.safeParse(taskId).success) return fail("Neteisingi duomenys.");
  if (date !== null && !isValidDayKey(date)) return fail("Neteisinga data.");
  const g = await guard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("tasks").update({ scheduled_date: date }).eq("id", taskId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko perkelti darbo.");
  return (data ?? []).length ? ok("Darbas perkeltas.") : fail("Neturite teisės perkelti šio darbo.");
}

/* ---------------------------------------------------------------- pastabos */
export async function addNote(body: string, kind: "text" | "voice" = "text"): Promise<ActionResult> {
  const parsed = z.string().trim().min(1, "Įrašykite pastabą.").max(4000, "Pastaba per ilga.").safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const g = await guard();
  if (bad(g)) return g;
  const { error } = await g.db
    .from("notes")
    .insert({ company_id: g.companyId, author_id: g.userId, kind: kind === "voice" ? "voice" : "text", body: parsed.data });
  refresh();
  if (!error) notifyLater(() => notifyNote({ companyId: g.companyId, userId: g.userId, body: parsed.data, voice: kind === "voice" }));
  return mapError(error, "Nepavyko išsiųsti pastabos.");
}

export async function toggleNote(id: string, isDone: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Neteisingas įrašas.");
  const g = await guard();
  if (bad(g)) return g;
  const { error } = await g.db.from("notes").update({ is_done: isDone }).eq("id", id).eq("author_id", g.userId);
  refresh();
  return mapError(error, "Nepavyko išsaugoti.");
}

export async function deleteNote(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("Neteisingas įrašas.");
  const g = await guard();
  if (bad(g)) return g;
  const { error } = await g.db.from("notes").delete().eq("id", id).eq("author_id", g.userId);
  refresh();
  return mapError(error, "Nepavyko ištrinti.");
}

/* ---------------------------------------------------------------- medžiagos */
const itemSchema = z.object({
  name: z.string().trim().min(1, "Įrašykite medžiagos pavadinimą.").max(200),
  quantity: z.number().positive("Kiekis turi būti didesnis už 0.").max(100000),
  unit: z.enum(UNITS),
});
const requestSchema = z.object({
  projectId: z.string().uuid().nullable(),
  comment: z.string().trim().max(1000).optional(),
  items: z.array(itemSchema).min(1, "Pridėkite bent vieną medžiagą.").max(50),
});

export async function createMaterialRequest(input: unknown): Promise<ActionResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const g = await guard();
  if (bad(g)) return g;
  const { error } = await g.db.rpc("create_material_request", {
    p_company_id: g.companyId,
    p_project_id: parsed.data.projectId,
    p_comment: parsed.data.comment ?? null,
    p_items: parsed.data.items.map((i) => ({ name: i.name, quantity: Math.round(i.quantity * 100) / 100, unit: i.unit })),
  });
  refresh();
  if (!error) {
    notifyLater(() =>
      notifyMaterialRequest({ companyId: g.companyId, userId: g.userId, projectId: parsed.data.projectId, comment: parsed.data.comment, items: parsed.data.items }),
    );
  }
  return error ? mapError(error, "Nepavyko išsiųsti prašymo.") : ok("Išsiųsta biurui.");
}

/* ------------------------------------------------- medžiagos: administratorius */
const NOT_ADMIN = "Medžiagas valdyti gali tik administratorius.";

/**
 * Pažymi medžiagą nupirkta arba grąžina į trūkstamų sąrašą. Kitos to paties prašymo medžiagos nekeičiamos.
 * Sąrašo perpiešimo čia nevykdome (greitis): kliento pusė atnaujina savo būseną ir vėliau persikrauna duomenis.
 */
export async function setMaterialPurchased(itemId: string, purchased: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(itemId).success) return fail("Neteisingas įrašas.");
  const g = await guard();
  if (bad(g)) return g;
  if (!g.admin) return fail(NOT_ADMIN);
  // Pirkimo datą ir patvirtinusį administratorių įrašo duomenų bazės trigeris (ne naršyklė).
  const { data, error } = await g.db
    .from("material_request_items")
    .update({ status: purchased ? "purchased" : "needed" })
    .eq("id", itemId)
    .eq("company_id", g.companyId)
    .select("id");
  if (error) return mapError(error, "Nepavyko pakeisti būsenos.");
  if (!(data ?? []).length) return fail("Medžiaga nerasta arba neturite teisės.");
  return ok(purchased ? "Pažymėta kaip nupirkta." : "Grąžinta į trūkstamų sąrašą.");
}

/** Greitas vieno ar kelių laukų (pavadinimas, kiekis, vienetas) išsaugojimas tiesiai sąraše. */
export async function patchMaterialItem(itemId: string, patch: { name?: string; quantity?: number; unit?: string }): Promise<ActionResult> {
  if (!idSchema.safeParse(itemId).success) return fail("Neteisingas įrašas.");
  const parsed = itemSchema.partial().safeParse(patch);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const update: Record<string, string | number> = {};
  if (parsed.data.name !== undefined) update.material_name = parsed.data.name;
  if (parsed.data.quantity !== undefined) update.quantity = Math.round(parsed.data.quantity * 100) / 100;
  if (parsed.data.unit !== undefined) update.unit = parsed.data.unit;
  if (Object.keys(update).length === 0) return ok();
  const g = await guard();
  if (bad(g)) return g;
  if (!g.admin) return fail(NOT_ADMIN);
  const { data, error } = await g.db.from("material_request_items").update(update).eq("id", itemId).eq("company_id", g.companyId).select("id");
  if (error) return mapError(error, "Nepavyko išsaugoti.");
  return (data ?? []).length ? ok() : fail("Medžiaga nerasta arba neturite teisės.");
}
