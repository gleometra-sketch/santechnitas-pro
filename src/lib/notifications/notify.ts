import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENTS, type Channel, type EventType } from "./events";
import { inappAdapter } from "./adapters/inapp";

export type Payload = { title: string; body: string; data?: Record<string, unknown> };

export type ChannelAdapter = (ctx: {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  address: Record<string, unknown>;
  event: EventType;
  payload: Payload;
}) => Promise<void>;

const adapters: Partial<Record<Channel, ChannelAdapter>> = { inapp: inappAdapter };

/** Naujus kanalus (telegram, email...) registruokite čia vėlesniuose žingsniuose. */
export function registerAdapter(channel: Channel, adapter: ChannelAdapter) {
  adapters[channel] = adapter;
}

type LogRow = { company_id: string; user_id: string; event_type: string; channel: string; status: string; detail?: string };

function minutesInZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function isQuietNow(start: string | null, end: string | null, tz: string, now = new Date()): boolean {
  if (!start || !end) return false;
  const cur = minutesInZone(now, tz);
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e; // pvz. 21:00–07:00
}

/**
 * Išsiunčia įvykį naudotojui pagal jo nustatymus.
 * `supabase` turi būti serverio klientas su service role raktu.
 * Pranešama tik aktyviems įmonės nariams.
 */
export async function notify(
  supabase: SupabaseClient,
  args: { companyId: string; userId: string; event: EventType; payload: Payload },
) {
  const { companyId, userId, event, payload } = args;
  const def = EVENTS[event];
  if (!def) throw new Error(`Nežinomas įvykis: ${event}`);

  const { data: member } = await supabase.from("company_members").select("id")
    .eq("company_id", companyId).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!member) return [];

  const [prefsRes, settingsRes, channelsRes] = await Promise.all([
    supabase.from("notification_preferences").select("channel, enabled")
      .eq("user_id", userId).eq("event_type", event),
    supabase.from("notification_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("notification_channels").select("channel, address, verified").eq("user_id", userId),
  ]);

  const explicit = new Map<string, boolean>((prefsRes.data ?? []).map((r) => [r.channel, r.enabled]));
  const connected = new Map<string, Record<string, unknown>>(
    (channelsRes.data ?? []).filter((c) => c.verified).map((c) => [c.channel, c.address ?? {}]),
  );
  const settings = settingsRes.data;
  const quiet = isQuietNow(settings?.quiet_start ?? null, settings?.quiet_end ?? null, settings?.timezone ?? "Europe/Vilnius");

  const wanted = (["inapp", "push", "telegram", "email", "sms"] as Channel[]).filter((ch) =>
    explicit.has(ch) ? explicit.get(ch) : (def.defaults as readonly Channel[]).includes(ch),
  );

  const log: LogRow[] = [];
  const base = { company_id: companyId, user_id: userId, event_type: event };
  const tried = new Set<Channel>();
  let externalFailed = false;

  async function send(ch: Channel, address: Record<string, unknown>) {
    tried.add(ch);
    try {
      await adapters[ch]!({ supabase, companyId, userId, address, event, payload });
      log.push({ ...base, channel: ch, status: "sent" });
      return true;
    } catch (e) {
      log.push({ ...base, channel: ch, status: "failed", detail: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }

  for (const ch of wanted) {
    if (ch !== "inapp" && !connected.has(ch)) {
      log.push({ ...base, channel: ch, status: "skipped", detail: "kanalas neprijungtas" });
      continue;
    }
    if (!adapters[ch]) {
      log.push({ ...base, channel: ch, status: "skipped", detail: "adapteris dar neįdiegtas" });
      continue;
    }
    if (ch !== "inapp" && quiet && !def.urgent) {
      // TODO (cron žingsnis): perskaityti 'deferred' įrašus ir išsiųsti pasibaigus tylos valandoms
      log.push({ ...base, channel: ch, status: "deferred", detail: "tylos valandos" });
      continue;
    }
    const ok = await send(ch, connected.get(ch) ?? {});
    if (!ok && ch !== "inapp") externalFailed = true;
  }

  const fb = settings?.fallback_channel as Channel | null | undefined;
  if (externalFailed && fb && !tried.has(fb) && connected.has(fb) && adapters[fb]) {
    await send(fb, connected.get(fb) ?? {});
  }

  if (log.length) await supabase.from("notification_log").insert(log);
  return log;
}
