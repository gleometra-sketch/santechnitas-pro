"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActionContext, isAdmin } from "@/lib/auth/context";
import { isValidDayKey } from "@/lib/dates";
import type { ActionResult } from "@/lib/work/types";

const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (error: string): ActionResult => ({ ok: false, error });
const refresh = () => revalidatePath("/", "layout");
const uuid = z.string().uuid();

function mapError(e: { code?: string; message?: string } | null, fallback: string): ActionResult {
  if (!e) return ok();
  if (e.code === "P0001" && e.message) return fail(e.message);
  if (e.code === "23505") return fail("Automobilis su tokiu valstybiniu numeriu jau yra.");
  if (e.code === "42501") return fail("Neturite teisės arba įmonės prieiga sustabdyta.");
  if (e.code === "23503") return fail("Pasirinktas vairuotojas nerastas.");
  if (e.code === "23514" || e.code === "22023") return fail("Patikrinkite įvestus duomenis.");
  return fail(fallback);
}

async function adminGuard() {
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  if (!ctx.companyId) return fail("Pirmiausia sukurkite įmonę.");
  if (!isAdmin(ctx.role)) return fail("Šį veiksmą gali atlikti tik administratorius.");
  return { db: await createClient(), userId: ctx.userId, companyId: ctx.companyId };
}
const bad = (g: unknown): g is ActionResult => typeof g === "object" && g !== null && "ok" in g;

/** Vairuotojas (arba administratorius) įveda kilometražą; taisykles užtikrina DB funkcija log_car_km. */
export async function logCarKm(carId: string, km: number): Promise<ActionResult> {
  if (!uuid.safeParse(carId).success) return fail("Neteisingas automobilis.");
  if (!Number.isInteger(km) || km <= 0 || km > 5_000_000) return fail("Įveskite teisingą kilometražą.");
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  const { error } = await (await createClient()).rpc("log_car_km", { p_car: carId, p_km: km });
  if (error) return mapError(error, "Nepavyko išsaugoti kilometražo.");
  refresh();
  return ok("Kilometražas išsaugotas.");
}

export async function setCarReminderDays(carId: string, days: number): Promise<ActionResult> {
  if (!uuid.safeParse(carId).success) return fail("Neteisingas automobilis.");
  if (![7, 14, 21].includes(days)) return fail("Leidžiama 7, 14 arba 21 diena.");
  const ctx = await getActionContext();
  if (!ctx) return fail("Sesija baigėsi. Prisijunkite iš naujo.");
  const { error } = await (await createClient()).rpc("set_car_reminder_days", { p_car: carId, p_days: days });
  if (error) return mapError(error, "Nepavyko pakeisti priminimo.");
  refresh();
  return ok("Priminimo dažnis pakeistas.");
}

const dateOrEmpty = z.union([z.literal(""), z.string().refine(isValidDayKey, "Neteisinga data.")]);
const intField = (label: string, min: number, max: number) =>
  z.coerce.number({ invalid_type_error: `${label}: įveskite skaičių.` }).int(`${label}: turi būti sveikasis skaičius.`).min(min, `${label}: per maža reikšmė.`).max(max, `${label}: per didelė reikšmė.`);

const carSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Įrašykite automobilio pavadinimą.").max(120, "Pavadinimas per ilgas."),
  plate: z.string().trim().min(1, "Įrašykite valstybinį numerį.").max(20, "Numeris per ilgas."),
  vin: z.string().trim().max(30, "VIN per ilgas.").optional(),
  driverId: z.union([z.literal(""), uuid]).optional(),
  km: intField("Kilometražas", 0, 5_000_000).optional(),
  oilLastKm: intField("Paskutinio tepalų keitimo km", 0, 5_000_000),
  oilIntervalKm: intField("Tepalų intervalas", 1, 200_000),
  oilWarnKm: intField("Įspėjimo riba", 0, 200_000),
  reminderDays: z.coerce.number().refine((n) => [7, 14, 21].includes(n), "Priminimas: 7, 14 arba 21 diena."),
  inspectionUntil: dateOrEmpty,
  roadTaxUntil: dateOrEmpty,
  insuranceUntil: dateOrEmpty,
});
const nul = (v?: string) => (v && v.trim() ? v.trim() : null);

/** Sukuria arba atnaujina automobilį (tik administratorius). Kilometražas keičiamas per logCarKm. */
export async function saveCar(input: unknown): Promise<ActionResult> {
  const p = carSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const g = await adminGuard();
  if (bad(g)) return g;
  const d = p.data;
  const common = {
    name: d.name, plate: d.plate.toUpperCase(), vin: nul(d.vin), driver_id: nul(d.driverId),
    oil_last_km: d.oilLastKm, oil_interval_km: d.oilIntervalKm, oil_warn_km: d.oilWarnKm, reminder_days: d.reminderDays,
    inspection_until: nul(d.inspectionUntil), road_tax_until: nul(d.roadTaxUntil), insurance_until: nul(d.insuranceUntil),
  };
  const { error } = d.id
    ? await g.db.from("cars").update(common).eq("id", d.id).eq("company_id", g.companyId)
    : await g.db.from("cars").insert({ ...common, km: d.km ?? 0, company_id: g.companyId, created_by: g.userId });
  refresh();
  return error ? mapError(error, "Nepavyko išsaugoti automobilio.") : ok(d.id ? "Automobilis išsaugotas." : "Automobilis pridėtas.");
}

export async function setCarActive(carId: string, active: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(carId).success) return fail("Neteisingas automobilis.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db.from("cars").update({ active }).eq("id", carId).eq("company_id", g.companyId);
  refresh();
  return error
    ? mapError(error, "Nepavyko pakeisti būsenos.")
    : ok(active ? "Automobilis aktyvus. Vairuotojas turės įvesti kilometražą." : "Automobilis neaktyvus. Terminų priminimai lieka.");
}

export async function deleteCar(carId: string): Promise<ActionResult> {
  if (!uuid.safeParse(carId).success) return fail("Neteisingas automobilis.");
  const g = await adminGuard();
  if (bad(g)) return g;
  const { error } = await g.db.from("cars").delete().eq("id", carId).eq("company_id", g.companyId);
  refresh();
  return error ? mapError(error, "Nepavyko ištrinti automobilio.") : ok("Automobilis ištrintas.");
}
