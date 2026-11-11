"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // PRITAIKYKITE: jūsų naršyklės Supabase kliento kelias

type Item = {
  id: string;
  title: string;
  body: string;
  event_type: string;
  read_at: string | null;
  created_at: string;
};

function ago(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("lt", { numeric: "auto" });
  if (abs < 60) return "ką tik";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

export default function NotificationBell() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [list, count] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, event_type, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    if (list.error || count.error) return setError(true);
    setError(false);
    setItems((list.data ?? []) as Item[]);
    setUnread(count.count ?? 0);
  }, [supabase]);

  // Naudotojas ir pirmas įkėlimas
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    load();
    // Naujas pranešimas -> perkrauti sąrašą (RLS leidžia matyti tik savo)
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  // Uždaryti paspaudus šalia arba Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target || target.read_at) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: now } : i)));
    setUnread((n) => Math.max(0, n - 1));
    const { error: err } = await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    if (err) load();
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? now })));
    setUnread(0);
    const { error: err } = await supabase.from("notifications").update({ read_at: now }).is("read_at", null);
    if (err) load();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Pranešimai, neskaitytų: ${unread}` : "Pranešimai"}
        aria-expanded={open}
        className="relative rounded-md p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-[1.1rem] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <h2 className="text-sm font-semibold">Pranešimai</h2>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-blue-700 hover:underline">
                Pažymėti visus skaitytais
              </button>
            )}
          </div>

          {error && <p role="alert" className="px-3 py-3 text-sm text-red-700">Nepavyko įkelti pranešimų.</p>}

          {!error && items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Pranešimų kol kas nėra.</p>
          )}

          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={`block w-full border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 ${
                    n.read_at ? "" : "bg-blue-50/60"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={`text-sm ${n.read_at ? "font-normal" : "font-semibold"}`}>{n.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">{ago(n.created_at)}</span>
                  </span>
                  {n.body && <span className="mt-0.5 block text-sm text-slate-600">{n.body}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
