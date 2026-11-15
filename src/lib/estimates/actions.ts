"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActionContext, isAdmin } from "@/lib/auth/context";
import { isValidDayKey } from "@/lib/dates";
import type { ActionResult } from "@/lib/work/types";
import { DEFAULT_UNIT, LINE_KINDS, MAX_LINES, parsePercentHundredths, parsePriceCents, parseQuantity } from "./calc";
import { STATUSES } from "./types";

type IdResult = { ok: true; id: string } | { ok: false; error: string };

const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const uuid = z.string().uuid();

function mapError(e: { code?: string; message?: string } | null, fallback: string): ActionResult {
  if (!e) return ok();
  if (e.code === "P0001" && e.message) return fail(e.message);
  if (e.code === "23505") return fail("Toks pavadinimas jau yra kataloge.");
  if (e.code === "42501") return fail("Neturite teisės arba įmonės prieiga sustabdyta.");
  if (e.code === "23514" || e.code === "22023" || e.code === "22P02" || e.code === "22007") return fail("Patikrinkite įvestus duomenis.");
  return fail(fallback);
}

async function adminGuard() {
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!ctx.companyId) return fail("Pirmiausia sukurkite įmonę.");
  if (!isAdmin(ctx.role)) return fail("Sąmatas gali tvarkyti tik administratorius.");
  return { db: await createClient(), companyId: ctx.companyId };
}
const bad = (g: unknown): g is { ok: false; error: string } => typeof g === "object" && g !== null && "ok" in g;

const text = (label: string, max: number) => z.string().trim().max(max, `${label}: per ilgas tekstas.`);

const lineSchema = z.object({
  kind: z.enum(LINE_KINDS as [string, ...string[]]),
  name: text("Pavadinimas", 200),
  unit: text("Vienetas", 20),
  qty: z.string().max(20),
  price: z.string().max(20),
});

const saveSchema = z.object({
  id: uuid,
  learn: z.boolean(),
  title: text("Pavadinimas", 200),
  projectId: z.union([z.literal(""), uuid]),
  clientName: text("Klientas", 160),
  clientPhone: text("Telefonas", 40),
  clientEmail: z.union([z.literal(""), z.string().trim().email("Neteisingas kliento el. paštas.").max(200)]),
  address: text("Adresas", 300),
  status: z.enum(STATUSES as [string, ...string[]]),
  vat: z.string().max(10),
  discount: z.string().max(10),
  validUntil: z.union([z.literal(""), z.string().refine(isValidDayKey, "Neteisinga galiojimo data.")]),
  notes: text("Pastabos", 4000),
  lines: z.array(lineSchema).max(MAX_LINES, `Per daug eilučių (daugiausia ${MAX_LINES}).`),
});

/**
 * Išsaugo visą sąmatą. Eilutės be pavadinimo, kiekio ir kainos praleidžiamos; tuščias kiekis ar kaina saugoma kaip 0
 * (juodraštį galima išsaugoti nebaigtą). `learn` = true: nauji pavadinimai ir kainos įrašomi į katalogą.
 */
export async function saveEstimate(input: unknown): Promise<ActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const g = await adminGuard();
  if (bad(g)) return g;

  const vat = d.vat.trim() === "" ? 0 : parsePercentHundredths(d.vat);
  if (vat === null) return fail("PVM procentas neteisingas (0–100).");
  const discount = d.discount.trim() === "" ? 0 : parsePercentHundredths(d.discount);
  if (discount === null) return fail("Nuolaidos procentas neteisingas (0–100).");

  const lines: { pos: number; kind: string; name: string; unit: string; quantity: number; price: number }[] = [];
  for (const [i, l] of d.lines.entries()) {
    const label = `${i + 1}. eilutė`;
    if (!l.name && !l.qty.trim() && !l.price.trim()) continue;
    if (!l.name) return fail(`${label}: įrašykite pavadinimą.`);
    const qty = l.qty.trim() === "" ? 0 : parseQuantity(l.qty);
    if (qty === null) return fail(`${label} (${l.name}): neteisingas kiekis.`);
    const price = l.price.trim() === "" ? 0 : parsePriceCents(l.price);
    if (price === null) return fail(`${label} (${l.name}): neteisinga kaina.`);
    lines.push({
      pos: lines.length,
      kind: l.kind,
      name: l.name,
      unit: l.unit || DEFAULT_UNIT[l.kind as keyof typeof DEFAULT_UNIT],
      quantity: qty / 1000,
      price,
    });
  }

  const header = {
    title: d.title, projectId: d.projectId, clientName: d.clientName, clientPhone: d.clientPhone, clientEmail: d.clientEmail,
    address: d.address, status: d.status, vatPercent: vat / 100, discountPercent: discount / 100, validUntil: d.validUntil, notes: d.notes,
  };
  const { error } = await g.db.rpc("save_estimate", { p_id: d.id, p_header: header, p_lines: lines, p_learn: d.learn });
  if (error) return mapError(error, "Nepavyko išsaugoti sąmatos.");
  revalidatePath("/samata");
  if (d.learn) revalidatePath("/samata/katalogas");
  return ok("Sąmata išsaugota.");
}

export async function createEstimate(): Promise<IdResult> {
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("estimates").insert({ company_id: g.companyId, title: "" }).select("id").single();
  if (error || !data) {
    const m = mapError(error, "Nepavyko sukurti sąmatos.");
    return m.ok ? fail("Nepavyko sukurti sąmatos.") : fail(m.error);
  }
  revalidatePath("/samata");
  return { ok: true, id: data.id as string };
}

export async function duplicateEstimate(id: string): Promise<IdResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisinga sąmata.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.rpc("duplicate_estimate", { p_id: id });
  if (error || !data) {
    const m = mapError(error, "Nepavyko sukurti kopijos.");
    return m.ok ? fail("Nepavyko sukurti kopijos.") : fail(m.error);
  }
  revalidatePath("/samata");
  return { ok: true, id: data as string };
}

export async function deleteEstimate(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisinga sąmata.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("estimates").delete().eq("id", id).select("id");
  if (error) return mapError(error, "Nepavyko ištrinti sąmatos.");
  if (!data || data.length === 0) return fail("Sąmata nerasta arba prieiga sustabdyta.");
  revalidatePath("/samata");
  return ok("Sąmata ištrinta.");
}

/* ------------------------------------------------------------------ katalogas */
const catalogSchema = z.object({
  id: uuid.optional(),
  kind: z.enum(LINE_KINDS as [string, ...string[]]),
  name: z.string().trim().min(1, "Įrašykite pavadinimą.").max(200, "Pavadinimas per ilgas."),
  unit: z.string().trim().min(1, "Įrašykite vienetą (pvz. m, vnt.).").max(20, "Vienetas per ilgas."),
  price: z.string().max(20),
});

export async function saveCatalogItem(input: unknown): Promise<ActionResult> {
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  const price = parsePriceCents(d.price);
  if (price === null) return fail("Įveskite teisingą kainą (pvz. 12,50).");
  const g = await adminGuard();
  if (bad(g)) return g;

  if (d.id) {
    const { data, error } = await g.db
      .from("estimate_catalog")
      .update({ kind: d.kind, name: d.name, unit: d.unit, unit_price_cents: price })
      .eq("id", d.id)
      .select("id");
    if (error) return mapError(error, "Nepavyko išsaugoti.");
    if (!data || data.length === 0) return fail("Įrašas nerastas arba prieiga sustabdyta.");
  } else {
    const { error } = await g.db
      .from("estimate_catalog")
      .insert({ company_id: g.companyId, kind: d.kind, name: d.name, unit: d.unit, unit_price_cents: price });
    if (error) return mapError(error, "Nepavyko pridėti.");
  }
  revalidatePath("/samata", "layout");
  return ok("Katalogas atnaujintas.");
}

export async function deleteCatalogItem(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Neteisingas įrašas.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { data, error } = await g.db.from("estimate_catalog").delete().eq("id", id).select("id");
  if (error) return mapError(error, "Nepavyko ištrinti.");
  if (!data || data.length === 0) return fail("Įrašas nerastas arba prieiga sustabdyta.");
  revalidatePath("/samata", "layout");
  return ok("Ištrinta iš katalogo.");
}
