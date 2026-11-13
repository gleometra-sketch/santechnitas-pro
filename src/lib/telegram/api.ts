const API = "https://api.telegram.org";

export type SendResult = { ok: true } | { ok: false; blocked: boolean; error: string };

/**
 * Siunčia žinutę per Telegram Bot API. Niekada nemeta klaidos: grąžina rezultatą.
 * `blocked` = vartotojas sustabdė botą arba ištrynė pokalbį, tokį prijungimą verta pašalinti.
 */
export async function sendMessage(chatId: number, html: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, blocked: false, error: "TELEGRAM_BOT_TOKEN nenustatytas" };
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as { description?: string };
    const blocked = res.status === 403 || (res.status === 400 && /chat not found/i.test(body.description ?? ""));
    return { ok: false, blocked, error: `Telegram ${res.status}: ${body.description ?? "klaida"}` };
  } catch (e) {
    return { ok: false, blocked: false, error: e instanceof Error ? e.message : "tinklo klaida" };
  }
}
