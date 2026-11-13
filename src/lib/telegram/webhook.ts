import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "./api";
import { CATEGORIES, esc, isCategory, isValidStartToken, parseCommand, sha256Hex, type Category } from "./core";

export type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string };
  };
};

const HELP = [
  "<b>DarboRitmas botas</b>",
  "Čia gausite pranešimus iš savo įmonės programos.",
  "",
  "/pranesimai – kokias kategorijas gaunate",
  "/isjungti &lt;kategorija&gt; – nebegauti kategorijos",
  "/ijungti &lt;kategorija&gt; – vėl gauti kategoriją",
  "/atsijungti – atjungti šį pokalbį",
  "",
  `Kategorijos: ${Object.keys(CATEGORIES).join(", ")}`,
].join("\n");

const NOT_LINKED =
  "Šis pokalbis dar neprijungtas. Programoje atidarykite <b>Valdymas → Telegram</b> ir paspauskite „Prijungti Telegram“.";

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const reply = (html: string) => sendMessage(chatId, html);

  if (msg.chat.type !== "private") {
    await reply("Šis botas veikia tik privačiame pokalbyje. Parašykite man tiesiogiai.");
    return;
  }

  const cmd = parseCommand(msg.text);
  if (!cmd) {
    await reply("Nesupratau. Komandų sąrašas: /pagalba");
    return;
  }

  const db = createAdminClient();

  switch (cmd.name) {
    case "start": {
      if (!cmd.arg) {
        await reply(`Sveiki! 👋\n\n${NOT_LINKED}\n\n/pagalba – komandos`);
        return;
      }
      await linkChat(db, chatId, msg.from?.username ?? null, cmd.arg, reply);
      return;
    }
    case "pagalba":
    case "help":
      await reply(HELP);
      return;
    case "atsijungti": {
      const { data } = await db.from("telegram_links").delete().eq("chat_id", chatId).select("id");
      await reply(data && data.length > 0 ? "Pokalbis atjungtas. Pranešimų daugiau negausite." : NOT_LINKED);
      return;
    }
    case "pranesimai": {
      const { data } = await db.from("telegram_links").select("muted").eq("chat_id", chatId);
      if (!data || data.length === 0) return void (await reply(NOT_LINKED));
      const lines = (Object.keys(CATEGORIES) as Category[]).map((c) => {
        const mutedEverywhere = data.every((l) => (l.muted ?? []).includes(c));
        return `${mutedEverywhere ? "🔕" : "🔔"} ${c} – ${CATEGORIES[c]}`;
      });
      await reply(`<b>Pranešimai</b>\n${lines.join("\n")}\n\nKeisti: /isjungti &lt;kategorija&gt; arba /ijungti &lt;kategorija&gt;`);
      return;
    }
    case "ijungti":
    case "isjungti": {
      const cat = cmd.arg.toLowerCase();
      if (!isCategory(cat)) {
        await reply(`Nežinoma kategorija. Galimos: ${Object.keys(CATEGORIES).join(", ")}`);
        return;
      }
      const { data: links } = await db.from("telegram_links").select("id, muted").eq("chat_id", chatId);
      if (!links || links.length === 0) return void (await reply(NOT_LINKED));
      const mute = cmd.name === "isjungti";
      await Promise.all(
        links.map((l) => {
          const rest = (l.muted ?? []).filter((m: string) => m !== cat);
          return db.from("telegram_links").update({ muted: mute ? [...rest, cat] : rest }).eq("id", l.id);
        }),
      );
      await reply(mute ? `🔕 ${esc(CATEGORIES[cat])}: išjungta.` : `🔔 ${esc(CATEGORIES[cat])}: įjungta.`);
      return;
    }
    default:
      await reply("Nežinoma komanda. /pagalba");
  }
}

async function linkChat(
  db: ReturnType<typeof createAdminClient>,
  chatId: number,
  username: string | null,
  token: string,
  reply: (html: string) => Promise<unknown>,
) {
  const invalid = "Nuoroda negalioja arba pasibaigė. Programoje sukurkite naują („Valdymas → Telegram“).";
  if (!isValidStartToken(token)) return void (await reply(invalid));

  // Kodas sunaudojamas atominiu trynimu: dviem vienu metu atėjusiems /start laimi tik vienas.
  const { data: tok } = await db
    .from("telegram_link_tokens")
    .delete()
    .eq("token_hash", await sha256Hex(token))
    .gt("expires_at", new Date().toISOString())
    .select("user_id, company_id")
    .maybeSingle();
  if (!tok) return void (await reply(invalid));

  // Vaidmuo tikrinamas dar kartą: kodas galėjo būti sukurtas prieš nuimant administratoriaus teises.
  const { data: member } = await db
    .from("company_members")
    .select("id")
    .eq("company_id", tok.company_id)
    .eq("user_id", tok.user_id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!member) return void (await reply("Ši paskyra nebėra įmonės administratorius."));

  // Tas pats Telegram pokalbis gali priklausyti tik vienam naudotojui toje įmonėje.
  await db.from("telegram_links").delete().eq("company_id", tok.company_id).eq("chat_id", chatId);
  const { error } = await db
    .from("telegram_links")
    .upsert(
      { user_id: tok.user_id, company_id: tok.company_id, chat_id: chatId, telegram_username: username, muted: [] },
      { onConflict: "user_id,company_id" },
    );
  if (error) {
    console.error("Telegram prijungimas nepavyko:", error.message);
    return void (await reply("Nepavyko prijungti. Bandykite dar kartą."));
  }
  const { data: company } = await db.from("companies").select("name").eq("id", tok.company_id).maybeSingle();
  await reply(`✅ Prijungta${company?.name ? `: <b>${esc(company.name)}</b>` : ""}.\nČia gausite pranešimus apie medžiagas, pastabas ir darbo pradžią bei pabaigą.\n\n/pagalba – komandos`);
}
