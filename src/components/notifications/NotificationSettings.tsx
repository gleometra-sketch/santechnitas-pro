"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CHANNELS, EVENTS, eventDef, type Channel, type EventType } from "@/lib/notifications/events";

type Pref = Record<string, boolean>; // raktas: "event:channel"
const key = (e: string, c: string) => `${e}:${c}`;
const field = "min-h-12 rounded-xl border border-black/15 bg-white px-3";

/** isAdmin: tik administratoriai mato Telegram stulpelį ir administratoriams skirtus pranešimus. */
export default function NotificationSettings({ isAdmin }: { isAdmin: boolean }) {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Pref>({});
  const [connected, setConnected] = useState<Set<string>>(new Set(["inapp"]));
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [fallback, setFallback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const channels = CHANNELS.filter((c) => c.available && (!c.adminOnly || isAdmin));
  const events = (Object.keys(EVENTS) as EventType[]).filter((e) => eventDef(e).available !== false && (isAdmin || !eventDef(e).adminOnly));

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return setLoading(false);
      setUserId(auth.user.id);
      const [p, s, c, tg] = await Promise.all([
        supabase.from("notification_preferences").select("event_type, channel, enabled"),
        supabase.from("notification_settings").select("*").maybeSingle(),
        supabase.from("notification_channels").select("channel, verified"),
        isAdmin ? supabase.from("telegram_links").select("id").limit(1) : Promise.resolve({ data: [], error: null }),
      ]);
      if (p.error || s.error || c.error || tg.error) setError("Nepavyko įkelti nustatymų. Perkraukite puslapį.");
      setPrefs(Object.fromEntries((p.data ?? []).map((r) => [key(r.event_type, r.channel), r.enabled])));
      const on = new Set<string>(["inapp"]);
      for (const x of c.data ?? []) if (x.verified && x.channel !== "telegram") on.add(x.channel);
      if ((tg.data ?? []).length > 0) on.add("telegram");
      setConnected(on);
      setQuietStart(s.data?.quiet_start?.slice(0, 5) ?? "");
      setQuietEnd(s.data?.quiet_end?.slice(0, 5) ?? "");
      setFallback(s.data?.fallback_channel ?? "");
      setLoading(false);
    })();
  }, [supabase, isAdmin]);

  const isOn = (e: EventType, c: Channel) => prefs[key(e, c)] ?? eventDef(e).defaults.includes(c);

  async function toggle(e: EventType, c: Channel) {
    if (!userId) return;
    const next = !isOn(e, c);
    const prev = prefs;
    setPrefs({ ...prefs, [key(e, c)]: next });
    const { error: err } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, event_type: e, channel: c, enabled: next });
    if (err) {
      setPrefs(prev);
      setError("Nepavyko išsaugoti pakeitimo. Bandykite dar kartą.");
    } else setError(null);
  }

  async function saveSettings(patch: Record<string, string | null>) {
    if (!userId) return;
    const { error: err } = await supabase.from("notification_settings").upsert({ user_id: userId, ...patch });
    setError(err ? "Nepavyko išsaugoti nustatymų. Bandykite dar kartą." : null);
  }

  if (loading) return <p className="text-sm text-muted">Kraunama…</p>;

  const external = channels.filter((c) => c.id !== "inapp" && connected.has(c.id));

  return (
    <section className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{error}</p>}

      {isAdmin && !connected.has("telegram") && (
        <p className="rounded-xl bg-accent-soft p-3 text-sm">
          Telegram dar neprijungtas.{" "}
          <Link href="/valdymas/telegram" className="font-semibold text-accent underline">Prijungti</Link>
        </p>
      )}

      <ul className="space-y-3">
        {events.map((e) => (
          <li key={e} className="rounded-2xl border border-black/10 p-3">
            <p className="font-semibold">{eventDef(e).label}</p>
            <p className="text-sm text-muted">{eventDef(e).description}</p>
            <div className="mt-1 divide-y divide-black/5">
              {channels.map((c) => {
                const usable = connected.has(c.id);
                return (
                  <label key={c.id} className={`flex min-h-12 items-center justify-between gap-3 ${usable ? "" : "opacity-50"}`}>
                    <span>{c.label}{!usable && <span className="ml-2 text-xs text-muted">neprijungta</span>}</span>
                    <input
                      type="checkbox"
                      className="h-6 w-6 shrink-0 accent-accent disabled:opacity-30"
                      checked={usable && isOn(e, c.id)}
                      disabled={!usable}
                      onChange={() => toggle(e, c.id)}
                      aria-label={`${eventDef(e).label}: ${c.label}`}
                    />
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-semibold">Tylos valandos</legend>
          <p className="mb-2 text-xs text-muted">
            Šiuo metu pranešimai už programos ribų nesiunčiami. Skubūs (terminai, sąmatos) vis tiek ateis.
          </p>
          <div className="flex items-center gap-2">
            <input type="time" value={quietStart} aria-label="Tylos valandų pradžia"
              onChange={(ev) => setQuietStart(ev.target.value)}
              onBlur={() => saveSettings({ quiet_start: quietStart || null })}
              className={`${field} min-w-0 flex-1`} />
            <span aria-hidden>–</span>
            <input type="time" value={quietEnd} aria-label="Tylos valandų pabaiga"
              onChange={(ev) => setQuietEnd(ev.target.value)}
              onBlur={() => saveSettings({ quiet_end: quietEnd || null })}
              className={`${field} min-w-0 flex-1`} />
          </div>
        </fieldset>

        {external.length > 0 && (
          <div>
            <label htmlFor="fallback" className="text-sm font-semibold">Atsarginis kanalas</label>
            <p className="mb-2 text-xs text-muted">Naudojamas, jei pranešimo nepavyko pristatyti pasirinktu kanalu.</p>
            <select id="fallback" value={fallback}
              onChange={(ev) => { setFallback(ev.target.value); saveSettings({ fallback_channel: ev.target.value || null }); }}
              className={`${field} w-full`}>
              <option value="">Nenaudoti</option>
              {external.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}
      </div>
    </section>
  );
}
