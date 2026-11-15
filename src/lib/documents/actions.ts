"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActionContext, isAdmin } from "@/lib/auth/context";
import { isValidDayKey } from "@/lib/dates";
import { parseNum } from "./logic";

export type DocResult = { ok: true; message?: string; id?: string; url?: string } | { ok: false; error: string };
const ok = (extra: { message?: string; id?: string; url?: string } = {}): DocResult => ({ ok: true, ...extra });
const fail = (error: string): DocResult => ({ ok: false, error });
const refresh = () => revalidatePath("/valdymas/dokumentai", "layout");

function mapError(e: { code?: string; message?: string } | null, fallback: string): DocResult {
  if (!e) return ok();
  if (e.code === "P0001" && e.message) return fail(e.message);
  if (e.code === "23505") return fail("Toks numeris jau yra. Bandykite dar kartą.");
  if (e.code === "23514" || e.code === "22P02" || e.code === "22003") return fail("Patikrinkite įvestus duomenis (pavadinimą, sumas, datas).");
  if (e.code === "23503") return fail("Pasirinktas objektas ar sąmata nerasti.");
  if (e.code === "42501") return fail("Neturite teisės arba įmonės prieiga sustabdyta.");
  return fail(fallback);
}

async function adminGuard() {
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!ctx.companyId) return fail("Pirmiausia sukurkite įmonę.");
  if (!isAdmin(ctx.role)) return fail("Šį veiksmą gali atlikti tik administratorius.");
  return { companyId: ctx.companyId, db: await createClient() };
}
const bad = (g: unknown): g is DocResult => typeof g === "object" && g !== null && "ok" in g;
const uuid = z.string().uuid();

const num = (label: string, min: number, max: number) =>
  z.preprocess((v) => (typeof v === "string" || typeof v === "number" ? parseNum(v) : v),
    z.number({ invalid_type_error: `${label}: įveskite skaičių.` }).min(min, `${label}: per maža reikšmė.`).max(max, `${label}: per didelė reikšmė.`));
const dateOrEmpty = z.union([z.literal(""), z.string().refine(isValidDayKey, "Neteisinga data.")]);

const itemSchema = z.object({
  description: z.string().trim().min(1, "Užpildykite visų eilučių aprašymus.").max(500, "Eilutės aprašymas per ilgas."),
  quantity: num("Kiekis", 0, 1_000_000),
  unit: z.string().trim().max(20, "Mato vienetas per ilgas.").optional(),
  unit_price: num("Vieneto kaina", 0, 10_000_000),
});

const docSchema = z.object({
  id: uuid.optional(),
  kind: z.enum(["estimate", "contract"]),
  title: z.string().trim().min(1, "Įrašykite pavadinimą.").max(200, "Pavadinimas per ilgas."),
  projectId: z.union([z.literal(""), uuid]).optional(),
  estimateId: z.union([z.literal(""), uuid]).optional(),
  clientName: z.string().trim().min(1, "Įrašykite kliento vardą ar pavadinimą.").max(160, "Kliento pavadinimas per ilgas."),
  clientEmail: z.string().trim().max(200).optional(),
  clientPhone: z.string().trim().max(40).optional(),
  clientAddress: z.string().trim().max(300).optional(),
  workAddress: z.string().trim().max(300).optional(),
  vatRate: num("PVM", 0, 100),
  validUntil: dateOrEmpty.optional(),
  notes: z.string().max(4000, "Pastabos per ilgos.").optional(),
  body: z.string().max(40000, "Sutarties tekstas per ilgas.").optional(),
  totalGross: num("Suma", 0, 100_000_000).optional(),
  items: z.array(itemSchema).max(200, "Per daug eilučių (daugiausia 200).").default([]),
});

export async function saveDocument(input: unknown): Promise<DocResult> {
  const p = docSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const d = p.data;
  if (d.kind === "estimate" && d.items.length === 0) return fail("Pridėkite bent vieną sąmatos eilutę.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.rpc("save_document", {
    p_id: d.id ?? null,
    p_doc: {
      company_id: g.companyId, kind: d.kind, title: d.title, project_id: d.projectId ?? "", estimate_id: d.estimateId ?? "",
      client_name: d.clientName, client_email: d.clientEmail ?? "", client_phone: d.clientPhone ?? "", client_address: d.clientAddress ?? "",
      work_address: d.workAddress ?? "", vat_rate: d.vatRate, valid_until: d.validUntil ?? "", notes: d.notes ?? "", body: d.body ?? "",
      total_gross: d.totalGross ?? 0,
    },
    p_items: d.items.map((i) => ({ description: i.description, quantity: i.quantity, unit: i.unit ?? "vnt.", unit_price: i.unit_price })),
  });
  if (error) return mapError(error, "Nepavyko išsaugoti dokumento.");
  refresh();
  return ok({ id: data as string, message: "Juodraštis išsaugotas." });
}

async function origin() {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = await headers();
  return `https://${h.get("host") ?? "localhost:3000"}`;
}

/** Pažymi dokumentą išsiųstu ir grąžina viešą nuorodą klientui. Pakartotinai kviečiama grąžina tą pačią nuorodą. */
export async function sendDocument(id: string): Promise<DocResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas dokumentas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.rpc("send_document", { p_id: id, p_token: randomBytes(24).toString("base64url") });
  if (error) return mapError(error, "Nepavyko paruošti nuorodos.");
  refresh();
  return ok({ id, url: `${await origin()}/d/${data as string}`, message: "Dokumentas paruoštas siuntimui." });
}

async function simple(fn: "cancel_document" | "delete_document", id: string, okMsg: string, failMsg: string): Promise<DocResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas dokumentas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db.rpc(fn, { p_id: id });
  refresh();
  return error ? mapError(error, failMsg) : ok({ message: okMsg });
}
export async function cancelDocument(id: string): Promise<DocResult> {
  return simple("cancel_document", id, "Dokumentas atšauktas.", "Nepavyko atšaukti.");
}
export async function deleteDocument(id: string): Promise<DocResult> {
  return simple("delete_document", id, "Dokumentas ištrintas.", "Nepavyko ištrinti.");
}

export async function duplicateDocument(id: string): Promise<DocResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas dokumentas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.rpc("duplicate_document", { p_id: id });
  if (error) return mapError(error, "Nepavyko nukopijuoti.");
  refresh();
  return ok({ id: data as string, message: "Sukurtas naujas juodraštis." });
}

const profileSchema = z.object({
  legal_name: z.string().trim().max(200), code: z.string().trim().max(30), vat_code: z.string().trim().max(30),
  address: z.string().trim().max(300), phone: z.string().trim().max(40), email: z.string().trim().max(200), iban: z.string().trim().max(40),
});
export async function saveCompanyProfile(input: unknown): Promise<DocResult> {
  const p = profileSchema.safeParse(input);
  if (!p.success) return fail("Patikrinkite rekvizitus (per ilgi laukai).");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db.rpc("save_company_profile", { p_company: g.companyId, p: p.data });
  refresh();
  return error ? mapError(error, "Nepavyko išsaugoti rekvizitų.") : ok({ message: "Rekvizitai išsaugoti." });
}

// ---------------------------------------------------------------- viešas atsakymas (be sesijos)
const respondSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{32,100}$/),
  decision: z.enum(["approved", "declined"]),
  name: z.string().trim().max(160, "Vardas per ilgas."),
  note: z.string().trim().max(1000, "Pastaba per ilga (daugiausia 1000 simbolių)."),
});

/** Klientas patvirtina arba atmeta. Saugo nuorodos kodas; sprendimą, vardą ir IP įrašo serveris. */
export async function respondToDocument(input: unknown): Promise<DocResult> {
  const p = respondSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Neteisinga užklausa.");
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const { error } = await createAdminClient().rpc("document_respond", {
    p_token: p.data.token, p_decision: p.data.decision, p_name: p.data.name, p_note: p.data.note, p_ip: ip,
  });
  if (error) return mapError(error, "Nepavyko išsaugoti atsakymo. Bandykite dar kartą.");
  return ok({ message: p.data.decision === "approved" ? "Ačiū! Patvirtinimas išsaugotas." : "Atsakymas išsaugotas." });
}
