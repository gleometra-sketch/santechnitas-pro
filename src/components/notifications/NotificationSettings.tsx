"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // PRITAIKYKITE: jūsų naršyklės Supabase kliento kelias
import { CHANNELS, EVENTS, type Channel, type EventType } from "@/lib/notifications/events";

type Pref = Record<string, boolean>; // raktas: "event:channel"
const key = (e: string, c: string) => `${e}:${c}`;

export default function NotificationSettings() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Pref>({});
  const [connected, setConnected] = useState<Set<string>>(new Set(["inapp"]));
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [fallback, setFallback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return setLoading(false);
      const uid = auth.user.id;
      setUserId(uid);
      const [p, s, c] = await Promise.all([
        supabase.from("notification_preferences").select("event_type, channel, enabled"),
        supabase.from("notification_settings").select("*").maybeSingle(),
        supabase.from("notification_channels").select("channel, verified"),
      ]);
      if (p.error || s.error || c.error) setError("Nepavyko įkelti nustatymų. Perkraukite puslapį.");
      setPrefs(Object.fromEntries((p.data ?? []).map((r) => [key(r.event_type, r.channel), r.enabled])));
      setConnected(new Set(["inapp", ...(c.data ?? []).filter((x) => x.verified).map((x) => x.channel)]));
      setQuietStart(s.data?.quiet_start?.slice(0, 5) ?? "");
      setQuietEnd(s.data?.quiet_end?.slice(0, 5) ?? "");
      setFallback(s.data?.fallback_channel ?? "");
      setLoading(false);
    })();
  }, [supabase]);

  const isOn = (e: EventType, c: Channel) =>
    prefs[key(e, c)] ?? (EVENTS[e].defaults as readonly Channel[]).includes(c);

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
    const { error: err } = await supabase
      .from("notification_settings")
      .upsert({ user_id: userId, ...patch });
    setError(err ? "Nepavyko išsaugoti nustatymų. Bandykite dar kartą." : null);
  }

  if (loading) return <p className="text-sm text-slate-500">Kraunama…</p>;

  const external = CHANNELS.filter((c) => c.id !== "inapp" && c.available && connected.has(c.id));

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Pranešimai</h2>
        <p className="mt-1 text-sm text-slate-600">Pasirinkite, kur gauti kiekvieną pranešimo rūšį.</p>
      </div>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" className="py-2 pr-4 font-medium">Pranešimas</th>
              {CHANNELS.map((c) => (
                <th key={c.id} scope="col" className="px-2 py-2 text-center font-medium">
                  {c.label}
                  {!c.available && <span className="block text-xs font-normal text-slate-400">Netrukus</span>}
                  {c.available && !connected.has(c.id) && (
                    <span className="block text-xs font-normal text-slate-400">Neprijungta</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(EVENTS) as EventType[]).map((e) => (
              <tr key={e} className="border-b border-slate-100">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <span className="block font-medium">{EVENTS[e].label}</span>
                  <span className="block text-xs text-slate-500">{EVENTS[e].description}</span>
                </th>
                {CHANNELS.map((c) => {
                  const usable = c.available && connected.has(c.id);
                  return (
                    <td key={c.id} className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-blue-600 disabled:opacity-30"
                        checked={usable && isOn(e, c.id)}
                        disabled={!usable}
                        onChange={() => toggle(e, c.id)}
                        aria-label={`${EVENTS[e].label}: ${c.label}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-medium">Tylos valandos</legend>
          <p className="mb-2 text-xs text-slate-500">
            Šiuo metu išoriniai pranešimai nesiunčiami. Sąmatų ir sutarčių pranešimai vis tiek ateis.
          </p>
          <div className="flex items-center gap-2">
            <input type="time" value={quietStart} aria-label="Tylos valandų pradžia"
              onChange={(ev) => setQuietStart(ev.target.value)}
              onBlur={() => saveSettings({ quiet_start: quietStart || null })}
              className="rounded-md border border-slate-300 px-2 py-1" />
            <span aria-hidden>–</span>
            <input type="time" value={quietEnd} aria-label="Tylos valandų pabaiga"
              onChange={(ev) => setQuietEnd(ev.target.value)}
              onBlur={() => saveSettings({ quiet_end: quietEnd || null })}
              className="rounded-md border border-slate-300 px-2 py-1" />
          </div>
        </fieldset>

        <div>
          <label htmlFor="fallback" className="text-sm font-medium">Atsarginis kanalas</label>
          <p className="mb-2 text-xs text-slate-500">Naudojamas, jei pranešimo nepavyko pristatyti pasirinktu kanalu.</p>
          <select id="fallback" value={fallback}
            onChange={(ev) => { setFallback(ev.target.value); saveSettings({ fallback_channel: ev.target.value || null }); }}
            className="rounded-md border border-slate-300 px-2 py-1">
            <option value="">Nenaudoti</option>
            {external.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}
