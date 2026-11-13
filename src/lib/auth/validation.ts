import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Neteisingas el. pašto adresas").max(254);
export const passwordSchema = z
  .string()
  .min(8, "Slaptažodis turi būti bent 8 simbolių")
  .max(72, "Slaptažodis per ilgas (daugiausia 72 simboliai)");
export const nameSchema = z.string().trim().min(2, "Įrašykite vardą ir pavardę").max(120);
export const companySchema = z.string().trim().min(2, "Įmonės pavadinimas per trumpas").max(120, "Įmonės pavadinimas per ilgas");

export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Patikrinkite įvestus duomenis";

/** Leidžia tik vidinius adresus, kad nebūtų nukreipiama į svetimą svetainę. */
export function safeNext(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // Valdymo simboliai (pvz. tabuliacija) naršyklėse pašalinami, todėl „/<tab>/svetima.lt“ taptų „//svetima.lt“.
  if (!v.startsWith("/") || v.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(v)) return null;
  return v;
}
