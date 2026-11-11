"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActionContext, getContext, isAdmin } from "@/lib/auth/context";
import { computeMonthReport, getMonthReport } from "@/lib/admin/queries";
import { fromLocalInput, isValidDayKey } from "@/lib/dates";
import { parseEuroToCents } from "@/lib/money";
import type { ActionResult } from "@/lib/work/types";

type Db = Awaited<ReturnType<typeof createClient>>;
const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (error: string): ActionResult => ({ ok: false, error });
const refresh = () => revalidatePath("/", "layout");
const uuid = z.string().uuid();

function mapError(e: { code?: string; message?: string } | null, fallback: string): ActionResult {
  if (!e) return ok();
  if (e.code === "P0001" && e.message) return fail(e.message);
  if (e.code === "23505") return fail("Toks įrašas jau egzistuoja.");
  if (e.code === "42501") return fail("Neturite teisės arba įmonės prieiga sustabdyta.");
  if (e.code === "23503") return fail("Susijęs įrašas nerastas (pvz., darbuotojas ar objektas).");
  if (e.code === "23514" || e.code === "22023") return fail("Patikrinkite įvestus duomenis.");
  return fail(fallback);
}

async function adminGuard(): Promise<{ db: Db; userId: string; companyId: string } | ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!ctx.companyId) return fail("Pirmiausia sukurkite įmonę.");
  if (!isAdmin(ctx.role)) return fail("Šį veiksmą gali atlikti tik administratorius.");
  return { db: await createClient(), userId: ctx.userId, companyId: ctx.companyId };
}
const bad = (g: unknown): g is ActionResult => typeof g === "object" && g !== null && "ok" in g;
const emptyToNull = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null);

/* ----------------------------------------------------------------- objektai */
const projectSchema = z.object({
  name: z.string().trim().min(1, "Įrašykite objekto pavadinimą.").max(160, "Pavadinimas per ilgas."),
  address: z.string().trim().max(300, "Adresas per ilgas.").optional(),
  orderNo: z.string().trim().max(60, "Užsakymo nr. per ilgas.").optional(),
  notes: z.string().trim().max(4000, "Pastabos per ilgos.").optional(),
  clientName: z.string().trim().max(160, "Kliento vardas per ilgas.").optional(),
  clientPhone: z
    .string()
    .trim()
    .max(40, "Telefono numeris per ilgas.")
    .regex(/^[0-9+()\-\s.]*$/, "Telefono numeryje gali būti tik skaitmenys, +, tarpai, skliaustai ir brūkšniai.")
    .optional(),
  clientEmail: z.union([z.literal(""), z.string().trim().email("Neteisingas kliento el. paštas.").max(200, "El. paštas per ilgas.")]).optional(),
});

export async function createProject(input: unknown): Promise<ActionResult> {
  const p = projectSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db.from("projects").insert({
    company_id: g.companyId,
    name: p.data.name,
    address: emptyToNull(p.data.address),
    order_no: emptyToNull(p.data.orderNo),
    notes: emptyToNull(p.data.notes),
    client_name: emptyToNull(p.data.clientName),
    client_phone: emptyToNull(p.data.clientPhone),
    client_email: emptyToNull(p.data.clientEmail),
    created_by: g.userId,
  });
  refresh();
  return error ? mapError(error, "Nepavyko sukurti objekto.") : ok("Objektas sukurtas.");
}

export async function updateProject(id: string, input: unknown): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas įrašas.");
  const p = projectSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db
    .from("projects")
    .update({ name: p.data.name, address: emptyToNull(p.data.address), order_no: emptyToNull(p.data.orderNo), notes: emptyToNull(p.data.notes), client_name: emptyToNull(p.data.clientName), client_phone: emptyToNull(p.data.clientPhone), client_email: emptyToNull(p.data.clientEmail) })
    .eq("id", id)
    .eq("company_id", g.companyId)
    .select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko išsaugoti.");
  return (data ?? []).length ? ok("Išsaugota.") : fail("Objektas nerastas.");
}

export async function setProjectArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas įrašas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("projects").update({ status: archived ? "archived" : "active" }).eq("id", id).eq("company_id", g.companyId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko pakeisti.");
  return (data ?? []).length ? ok(archived ? "Objektas archyvuotas." : "Objektas atkurtas.") : fail("Objektas nerastas.");
}

/* -------------------------------------------------------------------- darbai */
const dateOrNull = z
  .string()
  .nullable()
  .refine((v) => v === null || v === "" || isValidDayKey(v), "Neteisinga data.");

const taskSchema = z.object({
  title: z.string().trim().min(1, "Įrašykite darbo pavadinimą.").max(200, "Pavadinimas per ilgas."),
  description: z.string().trim().max(4000, "Aprašymas per ilgas.").optional(),
  projectId: z.string().uuid().nullable(),
  assigneeId: z.string().uuid().nullable(),
  date: dateOrNull,
});

export async function createTask(input: unknown, checklist: string[]): Promise<ActionResult> {
  const t = taskSchema.safeParse(input);
  if (!t.success) return fail(t.error.issues[0].message);
  const items = z.array(z.string().trim().min(1).max(200)).max(50).safeParse(checklist.map((s) => s.trim()).filter(Boolean));
  if (!items.success) return fail("Užduočių sąrašo punktas per ilgas arba jų per daug.");
  const g = await adminGuard();
  if (bad(g)) return g;

  const { data, error } = await g.db
    .from("tasks")
    .insert({
      company_id: g.companyId,
      title: t.data.title,
      description: emptyToNull(t.data.description),
      project_id: t.data.projectId,
      assigned_to: t.data.assigneeId,
      scheduled_date: t.data.date || null,
      created_by: g.userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    refresh();
    return mapError(error, "Nepavyko sukurti darbo.");
  }
  if (items.data.length) {
    const { error: iErr } = await g.db
      .from("task_checklist_items")
      .insert(items.data.map((title, i) => ({ company_id: g.companyId, task_id: data.id, title, position: i + 1 })));
    if (iErr) {
      await g.db.from("tasks").delete().eq("id", data.id); // neliekame pusiau sukurto darbo
      refresh();
      return mapError(iErr, "Nepavyko išsaugoti užduočių sąrašo.");
    }
  }
  refresh();
  return ok("Darbas sukurtas.");
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas įrašas.");
  const t = taskSchema.safeParse(input);
  if (!t.success) return fail(t.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db
    .from("tasks")
    .update({ title: t.data.title, description: emptyToNull(t.data.description), project_id: t.data.projectId, assigned_to: t.data.assigneeId, scheduled_date: t.data.date || null })
    .eq("id", id)
    .eq("company_id", g.companyId)
    .select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko išsaugoti.");
  return (data ?? []).length ? ok("Išsaugota.") : fail("Darbas nerastas.");
}

export async function deleteTask(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas įrašas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("tasks").delete().eq("id", id).eq("company_id", g.companyId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko ištrinti.");
  return (data ?? []).length ? ok("Darbas ištrintas.") : fail("Darbas nerastas.");
}

export async function addChecklistItem(taskId: string, title: string): Promise<ActionResult> {
  const t = z.string().trim().min(1, "Įrašykite punktą.").max(200, "Punktas per ilgas.").safeParse(title);
  if (!uuid.safeParse(taskId).success) return fail("Neteisingas įrašas.");
  if (!t.success) return fail(t.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data: last } = await g.db.from("task_checklist_items").select("position").eq("task_id", taskId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await g.db.from("task_checklist_items").insert({ company_id: g.companyId, task_id: taskId, title: t.data, position: (last?.position ?? 0) + 1 });
  refresh();
  return error ? mapError(error, "Nepavyko pridėti punkto.") : ok();
}

export async function deleteChecklistItem(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas įrašas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db.from("task_checklist_items").delete().eq("id", id).eq("company_id", g.companyId);
  refresh();
  return error ? mapError(error, "Nepavyko pašalinti punkto.") : ok();
}

/* ---------------------------------------------------------------- darbuotojai */
export async function inviteMember(emailRaw: string, role: "worker" | "admin"): Promise<ActionResult> {
  const email = z.string().trim().toLowerCase().email("Neteisingas el. pašto adresas.").max(200).safeParse(emailRaw);
  if (!email.success) return fail(email.error.issues[0].message);
  if (role !== "worker" && role !== "admin") return fail("Neteisingas vaidmuo.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db.from("company_members").insert({ company_id: g.companyId, email: email.data, role, status: "invited", invited_by: g.userId });
  refresh();
  if (error?.code === "23505") return fail("Šis el. paštas jau pridėtas. Jei darbuotojas pašalintas, paspauskite „Atkurti“.");
  return error ? mapError(error, "Nepavyko pridėti darbuotojo.") : ok("Pakvietimas sukurtas. Darbuotojas turi užsiregistruoti tuo el. paštu.");
}

export async function setMemberRole(memberId: string, role: "worker" | "admin"): Promise<ActionResult> {
  if (!uuid.safeParse(memberId).success || (role !== "worker" && role !== "admin")) return fail("Neteisingi duomenys.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("company_members").update({ role }).eq("id", memberId).eq("company_id", g.companyId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko pakeisti vaidmens.");
  return (data ?? []).length ? ok("Vaidmuo pakeistas.") : fail("Narys nerastas.");
}

/** Laukiantį pakvietimą ištrina, aktyvų narį pažymi kaip pašalintą (įrašai išlieka istorijoje). */
export async function removeMember(memberId: string, status: "invited" | "active"): Promise<ActionResult> {
  if (!uuid.safeParse(memberId).success) return fail("Neteisingas įrašas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data: target } = await g.db.from("company_members").select("user_id").eq("id", memberId).eq("company_id", g.companyId).maybeSingle();
  if (target?.user_id && target.user_id === g.userId) return fail("Savęs pašalinti negalima.");
  const res =
    status === "invited"
      ? await g.db.from("company_members").delete().eq("id", memberId).eq("company_id", g.companyId).eq("status", "invited").select("id")
      : await g.db.from("company_members").update({ status: "removed" }).eq("id", memberId).eq("company_id", g.companyId).eq("status", "active").select("id");
  refresh();
  if (res.error) return mapError(res.error, "Nepavyko pašalinti.");
  return (res.data ?? []).length ? ok(status === "invited" ? "Pakvietimas atšauktas." : "Darbuotojas pašalintas.") : fail("Narys nerastas arba jo pašalinti negalima.");
}

export async function restoreMember(memberId: string): Promise<ActionResult> {
  if (!uuid.safeParse(memberId).success) return fail("Neteisingas įrašas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("company_members").update({ status: "active" }).eq("id", memberId).eq("company_id", g.companyId).eq("status", "removed").select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko atkurti.");
  return (data ?? []).length ? ok("Darbuotojas atkurtas.") : fail("Narys nerastas.");
}

/* -------------------------------------------------------------- valandiniai įkainiai */
/** Nustato darbuotojo valandinį įkainį nuo nurodytos dienos (tą pačią dieną perrašo). Įkainio darbuotojas nemato. */
export async function setMemberRate(userId: string, euros: string, from: string): Promise<ActionResult> {
  if (!uuid.safeParse(userId).success) return fail("Neteisingas darbuotojas.");
  const cents = parseEuroToCents(euros);
  if (cents === null) return fail("Įkainis turi būti skaičius nuo 0 iki 1000 € su ne daugiau kaip 2 skaitmenimis po kablelio.");
  if (!isValidDayKey(from)) return fail("Neteisinga data.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db
    .from("member_rates")
    .upsert({ company_id: g.companyId, user_id: userId, hourly_rate_cents: cents, effective_from: from }, { onConflict: "company_id,user_id,effective_from" });
  refresh();
  return error ? mapError(error, "Nepavyko išsaugoti įkainio.") : ok("Įkainis išsaugotas.");
}

/* ----------------------------------------------------------- laiko apskaitos režimas */
const modeSchema = z.enum(["hours", "project"]);

/** Įmonės numatytasis režimas (galioja darbuotojams be asmeninio nustatymo). Galima keisti bet kada. */
export async function setCompanyTimeMode(mode: string): Promise<ActionResult> {
  const m = modeSchema.safeParse(mode);
  if (!m.success) return fail("Neteisingas režimas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("companies").update({ time_mode: m.data }).eq("id", g.companyId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko pakeisti.");
  return (data ?? []).length ? ok("Įmonės nustatymas pakeistas.") : fail("Neturite teisės.");
}

/** Vieno darbuotojo režimas; null – grįžti prie įmonės nustatymo. */
export async function setMemberTimeMode(memberId: string, mode: string | null): Promise<ActionResult> {
  if (!uuid.safeParse(memberId).success) return fail("Neteisingas įrašas.");
  const m = mode === null ? { success: true as const, data: null } : modeSchema.safeParse(mode);
  if (!m.success) return fail("Neteisingas režimas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("company_members").update({ time_mode: m.data }).eq("id", memberId).eq("company_id", g.companyId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko pakeisti.");
  return (data ?? []).length ? ok("Darbuotojo nustatymas pakeistas.") : fail("Narys nerastas.");
}

/* ---------------------------------------------------------------- darbo laikas */
const timeSchema = z.object({ userId: z.string().uuid(), start: z.string(), end: z.string(), projectId: z.string().uuid().nullable().optional() });

/** Sukuria arba pataiso užbaigtą darbo laiko įrašą (laikai – Lietuvos laiku, „YYYY-MM-DDTHH:mm“). */
export async function saveTimeEntry(id: string | null, input: unknown): Promise<ActionResult> {
  const t = timeSchema.safeParse(input);
  if (!t.success || (id !== null && !uuid.safeParse(id).success)) return fail("Neteisingi duomenys.");
  const start = fromLocalInput(t.data.start);
  const end = fromLocalInput(t.data.end);
  if (!start || !end) return fail("Įveskite pradžios ir pabaigos laiką.");
  if (Date.parse(end) <= Date.parse(start)) return fail("Pabaiga turi būti vėlesnė už pradžią.");
  if (Date.parse(end) - Date.parse(start) > 24 * 3_600_000) return fail("Vienas įrašas negali trukti ilgiau nei 24 val.");
  const g = await adminGuard();
  if (bad(g)) return g;

  if (id) {
    const { data, error } = await g.db.from("time_entries").update({ started_at: start, ended_at: end, project_id: t.data.projectId ?? null }).eq("id", id).eq("company_id", g.companyId).select("id");
    refresh();
    if (error) return mapError(error, "Nepavyko išsaugoti.");
    return (data ?? []).length ? ok("Išsaugota.") : fail("Įrašas nerastas.");
  }
  const { error } = await g.db.from("time_entries").insert({ company_id: g.companyId, user_id: t.data.userId, project_id: t.data.projectId ?? null, started_at: start, ended_at: end });
  refresh();
  return error ? mapError(error, "Nepavyko pridėti įrašo.") : ok("Įrašas pridėtas.");
}

export async function deleteTimeEntry(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas įrašas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("time_entries").delete().eq("id", id).eq("company_id", g.companyId).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko ištrinti.");
  return (data ?? []).length ? ok("Įrašas ištrintas.") : fail("Įrašas nerastas.");
}

/* ---------------------------------------------------------- valandų patvirtinimas */
const ymSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Neteisingas mėnuo.");

/** Patvirtina darbuotojo praėjusio mėnesio valandas ir užšaldo ataskaitos skaičius (įkainį, sumą). */
export async function approveMonth(userId: string, ym: string): Promise<ActionResult> {
  if (!uuid.safeParse(userId).success) return fail("Neteisingas darbuotojas.");
  const m = ymSchema.safeParse(ym);
  if (!m.success) return fail(m.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const ctx = await getContext();
  if (!ctx?.company) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  const live = await computeMonthReport(ctx, ym);
  const row = live.rows.find((r) => r.userId === userId);
  if (!row || row.minutes === 0) return fail("Šį mėnesį darbo laiko įrašų nėra.");
  if (row.openCount > 0) return fail("Yra neuždarytų darbo laiko įrašų. Pirmiausia juos užbaikite.");
  const { error } = await g.db.from("time_approvals").insert({
    company_id: g.companyId,
    user_id: userId,
    month: `${ym}-01`,
    minutes: row.minutes,
    snapshot: { name: row.name, minutes: row.minutes, amountCents: row.amountCents, missingRateMinutes: row.missingRateMinutes, rateCents: row.rateCents, byProject: row.byProject },
  });
  refresh();
  if (error?.code === "23505") return fail("Šis mėnuo jau patvirtintas.");
  return error ? mapError(error, "Nepavyko patvirtinti.") : ok(`${row.name}: valandos patvirtintos.`);
}

/** Patvirtina visų darbuotojų mėnesį, išskyrus tuos, kurie turi neuždarytų įrašų. */
export async function approveMonthAll(ym: string): Promise<ActionResult> {
  const m = ymSchema.safeParse(ym);
  if (!m.success) return fail(m.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const ctx = await getContext();
  if (!ctx?.company) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  const report = await getMonthReport(ctx, ym);
  let done = 0;
  let skipped = 0;
  let lastError = "";
  for (const r of report.rows) {
    if (r.approvedAt || r.minutes === 0) continue;
    if (r.openCount > 0) {
      skipped += 1;
      continue;
    }
    const { error } = await g.db.from("time_approvals").insert({
      company_id: g.companyId,
      user_id: r.userId,
      month: `${ym}-01`,
      minutes: r.minutes,
      snapshot: { name: r.name, minutes: r.minutes, amountCents: r.amountCents, missingRateMinutes: r.missingRateMinutes, rateCents: r.rateCents, byProject: r.byProject },
    });
    if (error) {
      skipped += 1;
      lastError = error.code === "P0001" ? error.message : "Nepavyko patvirtinti.";
    } else done += 1;
  }
  refresh();
  if (done === 0 && skipped > 0) return fail(lastError || "Visi likę darbuotojai turi neuždarytų įrašų.");
  return ok(skipped ? `Patvirtinta: ${done}. Praleista: ${skipped} (neuždaryti įrašai).` : `Patvirtinta: ${done}.`);
}

/** Atšaukia mėnesio patvirtinimą, kad įrašus vėl būtų galima taisyti. */
export async function revokeMonthApproval(userId: string, ym: string): Promise<ActionResult> {
  if (!uuid.safeParse(userId).success) return fail("Neteisingas darbuotojas.");
  const m = ymSchema.safeParse(ym);
  if (!m.success) return fail(m.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("time_approvals").delete().eq("company_id", g.companyId).eq("user_id", userId).eq("month", `${ym}-01`).select("id");
  refresh();
  if (error) return mapError(error, "Nepavyko atšaukti.");
  return (data ?? []).length ? ok("Patvirtinimas atšauktas.") : fail("Patvirtinimo nerasta.");
}
