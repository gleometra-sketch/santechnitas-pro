import type { ChannelAdapter } from "../notify";
import { TelegramError, escapeHtml, sendTelegram } from "../telegram";

// Kur nuveda nuoroda pranešime pagal įvykį.
const PATH: Record<string, string> = {
  task_assigned: "/darbai",
  work_reminder: "/darbai",
  daily_digest: "/kalendorius",
  car_deadline: "/kalendorius",
  car_km: "/kalendorius",
  car_oil: "/kalendorius",
  hours_missing: "/valandos",
  weekly_hours: "/valandos",
  hours_approved: "/valandos",
  material_request: "/valdymas",
  document_status: "/valdymas",
};

export const telegramAdapter: ChannelAdapter = async ({ supabase, userId, address, event, payload }) => {
  const chatId = address.chat_id;
  if (typeof chatId !== "string" && typeof chatId !== "number") throw new Error("Telegram chat_id nerastas");

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const link = base && PATH[event] ? `\n<a href="${base}${PATH[event]}">Atidaryti programoje</a>` : "";
  const text = `<b>${escapeHtml(payload.title)}</b>${payload.body ? `\n${escapeHtml(payload.body)}` : ""}${link}`;

  try {
    await sendTelegram(chatId, text);
  } catch (e) {
    // 403: naudotojas užblokavo botą arba ištrynė pokalbį – kanalą išjungiame, kad nebebandytume.
    if (e instanceof TelegramError && e.code === 403) {
      await supabase.from("notification_channels").update({ verified: false }).eq("user_id", userId).eq("channel", "telegram");
    }
    throw e;
  }
};
