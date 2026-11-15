import type { ChannelAdapter } from "../notify";
import { sendMessage } from "@/lib/telegram/api";
import { clip, esc } from "@/lib/telegram/core";

// Kur nuveda nuoroda pranešime pagal įvykį (Telegram gauna tik administratoriai).
const PATH: Record<string, string> = {
  car_deadline: "/valdymas/automobiliai",
  car_oil: "/valdymas/automobiliai",
  document_status: "/valdymas/dokumentai",
};

/**
 * Telegram kanalas pranešimų sistemoje. Gavėjas jau patikrintas notify(): aktyvus įmonės administratorius,
 * turintis prijungimą lentelėje telegram_links (address = { chat_id, muted }).
 */
export const telegramAdapter: ChannelAdapter = async ({ supabase, companyId, userId, address, event, payload }) => {
  const chatId = Number(address.chat_id);
  if (!Number.isFinite(chatId)) throw new Error("Telegram chat_id nerastas");

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const link = base && PATH[event] ? `\n<a href="${base}${PATH[event]}">Atidaryti programoje</a>` : "";
  const text = `<b>${esc(payload.title)}</b>${payload.body ? `\n${esc(clip(payload.body, 3000))}` : ""}${link}`;

  const r = await sendMessage(chatId, text);
  if (!r.ok) {
    // Naudotojas užblokavo botą arba ištrynė pokalbį: prijungimą pašaliname, kad nebebandytume.
    if (r.blocked) await supabase.from("telegram_links").delete().eq("company_id", companyId).eq("user_id", userId);
    throw new Error(r.error);
  }
};
