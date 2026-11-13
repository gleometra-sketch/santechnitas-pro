import { safeEqual } from "@/lib/telegram/core";
import { handleUpdate, type TelegramUpdate } from "@/lib/telegram/webhook";

export const dynamic = "force-dynamic";

/**
 * Telegram webhook. Telegram siunčia slaptą antraštę, kurią nurodėme per setWebhook (secret_token).
 * Be jos užklausa atmetama. Po sėkmingo patikrinimo visada grąžiname 200, kad Telegram nekartotų užklausų.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const given = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || !safeEqual(given, secret)) return new Response("forbidden", { status: 403 });

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    await handleUpdate(update);
  } catch (e) {
    console.error("Telegram webhook klaida:", e);
  }
  return Response.json({ ok: true });
}
