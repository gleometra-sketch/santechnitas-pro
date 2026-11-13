import { createHash } from "node:crypto";

const API = "https://api.telegram.org";

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export class TelegramError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

/** Išsiunčia tekstą (HTML) į Telegram pokalbį. Meta TelegramError, jei Telegram atmeta (pvz. 403 – botas užblokuotas). */
export async function sendTelegram(chatId: string | number, html: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN nenustatytas");
  const res = await fetch(`${API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { description?: string } | null;
    throw new TelegramError(j?.description ?? `Telegram klaida ${res.status}`, res.status);
  }
}
