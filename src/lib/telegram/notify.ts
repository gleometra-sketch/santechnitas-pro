import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "./api";
import { clip, esc, formatMinutes, type Category } from "./core";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Išsiunčia žinutę visiems įmonės administratoriams, kurie prijungė Telegram ir neišjungė šios kategorijos.
 * Niekada nemeta klaidos: pranešimo nesėkmė neturi sugadinti programos veiksmo.
 */
export async function notifyAdmins(companyId: string, category: Category, html: string, exceptUserId?: string): Promise<void> {
  try {
    const db = createAdminClient();
    // Vaidmenį tikriname siuntimo metu: nebe administratorius pranešimų negauna, nors prijungimas liko.
    const { data: admins } = await db
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]);
    const userIds = (admins ?? []).map((a) => a.user_id).filter((id): id is string => !!id && id !== exceptUserId); // paties veiksmo autoriaus nepinginame
    if (userIds.length === 0) return;

    const { data: links } = await db
      .from("telegram_links")
      .select("id, chat_id, muted")
      .eq("company_id", companyId)
      .in("user_id", userIds);

    await Promise.all(
      (links ?? [])
        .filter((l) => !(l.muted ?? []).includes(category))
        .map(async (l) => {
          const r = await sendMessage(Number(l.chat_id), html);
          if (!r.ok) {
            console.error("Telegram pranešimas nepavyko:", r.error);
            if (r.blocked) await db.from("telegram_links").delete().eq("id", l.id);
          }
        }),
    );
  } catch (e) {
    console.error("notifyAdmins klaida:", e);
  }
}

/** Paleidžia pranešimą po atsakymo naudotojui (Cloudflare: waitUntil), kad veiksmas nelauktų Telegram. */
export function notifyLater(job: () => Promise<void>) {
  const safe = () => job().catch((e) => console.error("Telegram pranešimas:", e));
  try {
    after(safe);
  } catch {
    void safe();
  }
}

/* ------------------------------------------------------------ žinučių šablonai */
async function nameOf(db: Admin, userId: string): Promise<string> {
  const { data } = await db.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return data?.full_name?.trim() || data?.email || "Darbuotojas";
}

async function projectName(db: Admin, projectId: string | null | undefined): Promise<string | null> {
  if (!projectId) return null;
  const { data } = await db.from("projects").select("name").eq("id", projectId).maybeSingle();
  return data?.name ?? null;
}

export async function notifyMaterialRequest(args: {
  companyId: string;
  userId: string;
  projectId: string | null;
  comment?: string | null;
  items: { name: string; quantity: number; unit: string }[];
}) {
  const db = createAdminClient();
  const [who, project] = await Promise.all([nameOf(db, args.userId), projectName(db, args.projectId)]);
  const lines = args.items.slice(0, 15).map((i) => `• ${esc(i.name)} – ${i.quantity} ${esc(i.unit)}`);
  if (args.items.length > 15) lines.push(`… ir dar ${args.items.length - 15}`);
  const text = [
    `🧰 <b>Medžiagų poreikis</b>`,
    `${esc(who)}${project ? ` · ${esc(project)}` : ""}`,
    ...lines,
    args.comment?.trim() ? `\n💬 ${esc(clip(args.comment, 500))}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await notifyAdmins(args.companyId, "medziagos", text, args.userId);
}

export async function notifyNote(args: { companyId: string; userId: string; body: string; voice: boolean }) {
  const db = createAdminClient();
  const who = await nameOf(db, args.userId);
  const body = args.voice ? "🎙 Balso pastaba (atidarykite programą)" : esc(clip(args.body, 1500));
  await notifyAdmins(args.companyId, "pastabos", `📝 <b>Pastaba biurui</b>\n${esc(who)}\n${body}`, args.userId);
}

export async function notifyWorkStarted(args: { companyId: string; userId: string; projectId?: string | null; switched?: boolean }) {
  const db = createAdminClient();
  const [who, project] = await Promise.all([nameOf(db, args.userId), projectName(db, args.projectId)]);
  const verb = args.switched ? "pakeitė objektą" : "pradėjo darbą";
  await notifyAdmins(args.companyId, "darbas", `▶️ <b>${esc(who)}</b> ${verb}${project ? `\n📍 ${esc(project)}` : ""}`, args.userId);
}

export async function notifyWorkFinished(args: { companyId: string; userId: string; entryId: string }) {
  const db = createAdminClient();
  const [who, entry, breaks] = await Promise.all([
    nameOf(db, args.userId),
    db.from("time_entries").select("started_at, ended_at, project_id").eq("id", args.entryId).maybeSingle(),
    db.from("breaks").select("started_at, ended_at").eq("time_entry_id", args.entryId),
  ]);
  const e = entry.data;
  let duration = "";
  if (e?.started_at && e.ended_at) {
    const breakMs = (breaks.data ?? []).reduce(
      (sum, b) => sum + (b.ended_at ? new Date(b.ended_at).getTime() - new Date(b.started_at).getTime() : 0),
      0,
    );
    const ms = new Date(e.ended_at).getTime() - new Date(e.started_at).getTime() - breakMs;
    duration = `\n⏱ Dirbta: ${formatMinutes(ms / 60000)}`;
  }
  const project = await projectName(db, e?.project_id);
  await notifyAdmins(args.companyId, "darbas", `⏹ <b>${esc(who)}</b> baigė darbą${project ? `\n📍 ${esc(project)}` : ""}${duration}`, args.userId);
}
