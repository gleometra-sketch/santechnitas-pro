"use server";

import { revalidatePath } from "next/cache";
import { getActionContext, isAdmin } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/work/types";
import { newToken } from "./core";

const TOKEN_MINUTES = 15;

type LinkResult = { ok: true; url: string; minutes: number } | { ok: false; error: string };

/** Sukuria vienkartinę prijungimo nuorodą (galioja 15 min.). Tik įmonės administratoriui. */
export async function createTelegramLink(): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return { ok: false, error: "Sesija baigėsi. Prisijunkite iš naujo." };
  if (!ctx.companyId || !isAdmin(ctx.role)) return { ok: false, error: "Telegram gali prijungti tik administratorius." };
  const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!bot || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) {
    return { ok: false, error: "Telegram botas dar nesukonfigūruotas (žr. docs/TELEGRAM.md)." };
  }

  const db = createAdminClient();
  const { token, hash } = await newToken();
  const now = new Date();
  // Seni kodai tvarkomi čia, kad nereikėtų atskiros valymo užduoties; šio naudotojo ankstesni kodai nebegalioja.
  await db.from("telegram_link_tokens").delete().lt("expires_at", now.toISOString());
  await db.from("telegram_link_tokens").delete().eq("user_id", ctx.userId).eq("company_id", ctx.companyId);
  const { error } = await db.from("telegram_link_tokens").insert({
    token_hash: hash,
    user_id: ctx.userId,
    company_id: ctx.companyId,
    expires_at: new Date(now.getTime() + TOKEN_MINUTES * 60_000).toISOString(),
  });
    if (error) {
    console.error("telegram_link_tokens insert:", error);
    return { ok: false, error: `Nepavyko sukurti nuorodos: ${error.message} (${error.code})` };
  }
  return { ok: true, url: `https://t.me/${bot}?start=${token}`, minutes: TOKEN_MINUTES };
}

export async function disconnectTelegram(): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx?.companyId) return { ok: false, error: "Sesija baigėsi. Prisijunkite iš naujo." };
  const { error } = await createAdminClient().from("telegram_links").delete().eq("user_id", ctx.userId).eq("company_id", ctx.companyId);
  revalidatePath("/valdymas/telegram");
  return error ? { ok: false, error: "Nepavyko atjungti." } : { ok: true, message: "Telegram atjungtas." };
}
