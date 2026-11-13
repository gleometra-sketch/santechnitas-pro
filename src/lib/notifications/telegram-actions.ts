"use server";

import { randomBytes } from "node:crypto";
import { getActionContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "./telegram";

export type LinkResult = { ok: true; url: string } | { ok: false; error: string };

/** Sukuria vienkartinę (15 min.) nuorodą į botą, kuri prijungia Telegram prie šio naudotojo. */
export async function createTelegramLink(): Promise<LinkResult> {
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot || !process.env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "Telegram botas dar nesukonfigūruotas." };
  const ctx = await getActionContext();
  if (!ctx) return { ok: false, error: "Sesija baigėsi. Prisijunkite iš naujo." };

  const token = randomBytes(24).toString("base64url");
  const admin = createAdminClient();
  await admin.from("telegram_link_tokens").delete().eq("user_id", ctx.userId);
  const { error } = await admin.from("telegram_link_tokens").insert({
    token_hash: hashToken(token),
    user_id: ctx.userId,
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: "Nepavyko sukurti nuorodos. Bandykite dar kartą." };
  return { ok: true, url: `https://t.me/${bot.replace(/^@/, "")}?start=${token}` };
}

export async function disconnectTelegram(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getActionContext();
  if (!ctx) return { ok: false, error: "Sesija baigėsi. Prisijunkite iš naujo." };
  const { error } = await createAdminClient().from("notification_channels").delete().eq("user_id", ctx.userId).eq("channel", "telegram");
  return error ? { ok: false, error: "Nepavyko atjungti." } : { ok: true };
}
