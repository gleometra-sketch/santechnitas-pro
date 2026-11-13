"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTelegramLink, disconnectTelegram } from "@/lib/notifications/telegram-actions";

export default function TelegramConnect() {
  const [supabase] = useState(() => createClient());
  const [connected, setConnected] = useState<boolean | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("notification_channels").select("verified").eq("channel", "telegram").maybeSingle();
    setConnected(data?.verified === true);
  }, [supabase]);

  useEffect(() => { void refresh(); }, [refresh]);

  const connect = () =>
    start(async () => {
      setError(null);
      const r = await createTelegramLink();
      if (r.ok) setLink(r.url); else setError(r.error);
    });
  const disconnect = () =>
    start(async () => {
      const r = await disconnectTelegram();
      if (r.ok) { setLink(null); setConnected(false); } else setError(r.error ?? "Klaida.");
    });

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card">
      <h2 className="text-xl font-bold">Telegram</h2>
      <p className="mt-1 text-sm text-muted">Gaukite visus DarboRitmo pranešimus Telegram programėlėje.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-danger">{error}</p>}
      {connected ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-go-soft px-3 py-1 text-sm font-semibold text-go-dark">Prijungta</span>
          <button disabled={pending} onClick={disconnect} className="min-h-12 rounded-2xl border border-black/15 px-4 font-semibold disabled:opacity-60">Atjungti</button>
        </div>
      ) : link ? (
        <div className="mt-3 space-y-2">
          <a href={link} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-2xl bg-accent px-5 font-semibold text-white">Atidaryti Telegram ir paspausti Start</a>
          <button onClick={() => void refresh()} className="min-h-12 w-full rounded-2xl border border-black/15 px-4 font-semibold">Patikrinti, ar prijungta</button>
          <p className="text-xs text-muted">Nuoroda galioja 15 minučių.</p>
        </div>
      ) : (
        <button disabled={pending || connected === null} onClick={connect} className="mt-3 min-h-12 rounded-2xl bg-accent px-5 font-semibold text-white disabled:opacity-60">Prijungti Telegram</button>
      )}
    </section>
  );
}
