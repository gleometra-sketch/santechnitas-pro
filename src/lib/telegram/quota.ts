import type { SupabaseClient } from "@supabase/supabase-js";
import { telegramPriority } from "./core";

export type QuotaResult = { allowed: boolean; reason?: string; used?: number; limit?: number };

/**
 * Rezervuoja vieną Telegram žinutę įmonės mėnesio limite (duomenų bazės funkcija take_telegram_quota, žr. 0022_plans.sql).
 * Viena žinutė = vienas gavėjas (administratorius). `supabase` turi būti service role klientas.
 *
 * Saugumo tinklas: jei funkcijos nėra (migracija dar nepaleista) ar įvyko klaida, žinutė LEIDŽIAMA, kad svarbūs
 * pranešimai nedingtų dėl techninės klaidos. Programos varpelis nuo šio limito nepriklauso.
 */
export async function takeTelegramQuota(db: SupabaseClient, companyId: string, category: string): Promise<QuotaResult> {
  if (typeof (db as { rpc?: unknown }).rpc !== "function") return { allowed: true };
  try {
    const { data, error } = await db.rpc("take_telegram_quota", { p_company: companyId, p_category: category, p_priority: telegramPriority(category) });
    if (error) {
      console.error("take_telegram_quota:", error.message);
      return { allowed: true };
    }
    const r = data as { allowed?: unknown; reason?: unknown; used?: unknown; limit?: unknown } | null;
    if (!r || typeof r.allowed !== "boolean") return { allowed: true };
    return { allowed: r.allowed, reason: typeof r.reason === "string" ? r.reason : undefined, used: typeof r.used === "number" ? r.used : undefined, limit: typeof r.limit === "number" ? r.limit : undefined };
  } catch (e) {
    console.error("take_telegram_quota:", e);
    return { allowed: true };
  }
}

export const QUOTA_REASON_LT: Record<string, string> = {
  no_plan: "įmonė neturi aktyvaus plano",
  plan: "planas neapima Telegram",
  limit: "pasiektas mėnesio limitas",
  low_priority_paused: "pasiekta 80 % limito: darbo pradžios ir pabaigos žinutės sustabdytos",
};
