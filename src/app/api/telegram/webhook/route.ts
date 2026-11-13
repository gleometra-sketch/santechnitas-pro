import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, hashToken, sendTelegram } from "@/lib/notifications/telegram";

export const dynamic = "force-dynamic";

type Update = {
  message?: { text?: string; chat?: { id: number; type: string }; from?: { username?: string; first_name?: string } };
};

function authorized(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

const HELP = "Sveiki! Čia DarboRitmas. Norėdami gauti pranešimus, programoje atidarykite Pranešimai ir paspauskite „Prijungti Telegram“.";

/** Telegram webhook: /start <kodas> prijungia pokalbį, /stop atjungia. */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: true });
  }
  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = (msg?.text ?? "").trim();
  // Atsakome 200 net po klaidos, kad Telegram nekartotų to paties pranešimo be galo.
  if (!msg || chatId === undefined || msg.chat?.type !== "private" || !text.startsWith("/")) return NextResponse.json({ ok: true });

  try {
    const admin = createAdminClient();
    const [command, arg] = text.split(/\s+/, 2);

    if (command.startsWith("/start") && arg) {
      const { data } = await admin
        .from("telegram_link_tokens")
        .delete()
        .eq("token_hash", hashToken(arg))
        .gt("expires_at", new Date().toISOString())
        .select("user_id")
        .maybeSingle();
      if (!data) {
        await sendTelegram(chatId, "Nuoroda nebegalioja. Programoje paspauskite „Prijungti Telegram“ dar kartą.");
      } else {
        const { error } = await admin.from("notification_channels").upsert({
          user_id: data.user_id,
          channel: "telegram",
          address: { chat_id: String(chatId), username: msg.from?.username ?? null },
          verified: true,
        });
        await sendTelegram(
          chatId,
          error ? "Nepavyko prijungti. Bandykite dar kartą." : `Telegram prijungtas${msg.from?.first_name ? `, ${escapeHtml(msg.from.first_name)}` : ""}. Čia gausite DarboRitmo pranešimus. Atjungti galite komanda /stop.`,
        );
      }
    } else if (command.startsWith("/stop")) {
      await admin.from("notification_channels").delete().eq("channel", "telegram").eq("address->>chat_id", String(chatId));
      await sendTelegram(chatId, "Telegram pranešimai atjungti. Vėl prijungti galite programoje.");
    } else {
      await sendTelegram(chatId, escapeHtml(HELP));
    }
  } catch {
    /* ignoruojame: žr. komentarą aukščiau */
  }
  return NextResponse.json({ ok: true });
}
